from __future__ import annotations

import json
import tempfile
import threading
import time
import traceback
import urllib.error
from argparse import Namespace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, cast
from urllib.parse import urlparse
from urllib.request import urlopen

import sys

SCRIPT_DIR = Path(__file__).resolve().parent
BENCHMARK_DIR = SCRIPT_DIR.parent / "ocr-benchmark"
sys.path.insert(0, str(BENCHMARK_DIR))

from field_parser import parse_expense_fields  # noqa: E402
import run_paddleocr as paddleocr_runner  # noqa: E402
from run_paddleocr import run_paddleocr  # noqa: E402


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8017
DEFAULT_MAX_CONCURRENT_REQUESTS = 1
DEFAULT_BUSY_WAIT_SECONDS = 2.0
WORKER_VERSION = "expense-ocr-worker-0.1"
MODEL_VERSION = "PP-OCRv5-th-mobile-rec"


class OcrWorkerError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class ExpenseOcrServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        handler_class: type[BaseHTTPRequestHandler],
        max_concurrent_requests: int,
        busy_wait_seconds: float,
    ):
        super().__init__(server_address, handler_class)
        self.max_concurrent_requests = max(1, max_concurrent_requests)
        self.busy_wait_seconds = max(0.0, busy_wait_seconds)
        self._semaphore = threading.BoundedSemaphore(self.max_concurrent_requests)
        self._state_lock = threading.Lock()
        self._running_requests = 0

    @property
    def running_requests(self) -> int:
        with self._state_lock:
            return self._running_requests

    def try_acquire_worker(self) -> bool:
        acquired = self._semaphore.acquire(timeout=self.busy_wait_seconds)
        if acquired:
            with self._state_lock:
                self._running_requests += 1
        return acquired

    def release_worker(self) -> None:
        with self._state_lock:
            self._running_requests = max(0, self._running_requests - 1)
        self._semaphore.release()


class ExpenseOcrHandler(BaseHTTPRequestHandler):
    server_version = "ExpenseOcrWorker/0.1"

    def do_GET(self) -> None:
        if self.path == "/health":
            server = cast(ExpenseOcrServer, self.server)
            running = server.running_requests
            max_concurrent = server.max_concurrent_requests
            self.write_json(
                200,
                {
                    "status": "busy" if running >= max_concurrent else "ok",
                    "workerVersion": WORKER_VERSION,
                    "modelVersion": MODEL_VERSION,
                    "modelLoaded": getattr(paddleocr_runner, "_PADDLEOCR_ENGINE", None) is not None,
                    "busy": running >= max_concurrent,
                    "running": running,
                    "maxConcurrentRequests": max_concurrent,
                },
            )
            return
        self.write_json(404, {"error": "NOT_FOUND"})

    def do_POST(self) -> None:
        if self.path != "/v1/ocr/expense":
            self.write_json(404, {"error": "NOT_FOUND"})
            return

        request: dict[str, Any] = {}
        server = cast(ExpenseOcrServer, self.server)
        acquired = server.try_acquire_worker()
        if not acquired:
            self.write_json(
                429,
                {
                    "error": "WORKER_BUSY",
                    "message": "OCR worker is busy. Retry later.",
                    "retryAfterSeconds": 30,
                },
            )
            return

        try:
            request = self.read_json()
            response = process_expense_ocr(request)
            self.write_json(200, response)
        except OcrWorkerError as exc:
            print(
                f"[expense-ocr-worker] {exc.code}: {exc}; keys={list(request.keys())}",
                file=sys.stderr,
            )
            self.write_json(exc.status_code, {"error": exc.code, "message": str(exc)})
        except ValueError as exc:
            print(
                f"[expense-ocr-worker] bad request: {exc}; keys={list(request.keys())}",
                file=sys.stderr,
            )
            self.write_json(400, {"error": type(exc).__name__, "message": str(exc)})
        except Exception as exc:
            print(
                f"[expense-ocr-worker] error: {type(exc).__name__}: {exc}",
                file=sys.stderr,
            )
            traceback.print_exc(file=sys.stderr)
            self.write_json(500, {"error": "OCR_FAILED", "message": str(exc)})
        finally:
            server.release_worker()

    def read_json(self) -> dict[str, Any]:
        if self.headers.get("Transfer-Encoding", "").lower() == "chunked":
            body = self.read_chunked_body()
            if not body:
                return {}
            return json.loads(body.decode("utf-8"))

        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def read_chunked_body(self) -> bytes:
        chunks: list[bytes] = []
        while True:
            line = self.rfile.readline().strip()
            if not line:
                continue
            size = int(line.split(b";", 1)[0], 16)
            if size == 0:
                while True:
                    trailer = self.rfile.readline()
                    if trailer in (b"\r\n", b"\n", b""):
                        break
                break
            chunks.append(self.rfile.read(size))
            self.rfile.read(2)
        return b"".join(chunks)

    def write_json(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[expense-ocr-worker] {self.address_string()} - {format % args}", file=sys.stderr)


def process_expense_ocr(request: dict[str, Any]) -> dict[str, Any]:
    attachment_url = required_string(request, "attachmentUrl", "AttachmentUrl", "attachment_url")
    validate_attachment_url(attachment_url)
    document_type = str(request.get("documentType") or "Other")
    profile = str(request.get("profile") or "fast")
    max_side = int(request.get("maxSide") or 800)
    provider = str(request.get("provider") or "PaddleOCR")

    print(
        "[expense-ocr-worker] processing "
        f"documentType={document_type} profile={profile} maxSide={max_side} "
        f"attachmentUrl={attachment_url}",
        file=sys.stderr,
    )

    started = time.perf_counter()
    try:
        with download_to_temp(attachment_url) as image_path:
            raw_text, lines = run_paddleocr(
                image_path,
                Namespace(lang="th,en", profile=profile, max_side=max_side),
            )
    except OcrWorkerError:
        raise
    except TimeoutError as exc:
        raise OcrWorkerError("OCR_TIMEOUT", str(exc), 504) from exc
    except Exception as exc:
        raise OcrWorkerError("OCR_FAILED", str(exc), 500) from exc

    parsed = parse_expense_fields(raw_text, document_type, lines)
    parsed_json = json.dumps(
        {
            key: {
                "value": str(value.value),
                "confidence": value.confidence,
                "source": value.source,
            }
            for key, value in parsed.items()
        },
        ensure_ascii=False,
    )
    confidence_score = average_confidence(lines)
    duration_ms = round((time.perf_counter() - started) * 1000, 2)

    return {
        "provider": provider,
        "rawText": raw_text,
        "parsedJson": parsed_json,
        "rawLinesJson": json.dumps(lines, ensure_ascii=False),
        "confidenceScore": confidence_score,
        "durationMs": duration_ms,
        "workerVersion": WORKER_VERSION,
        "modelVersion": MODEL_VERSION,
    }


class download_to_temp:
    def __init__(self, url: str):
        self.url = url
        self.path: Path | None = None

    def __enter__(self) -> Path:
        parsed = urlparse(self.url)
        suffix = Path(parsed.path).suffix or ".jpg"
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        temp.close()
        self.path = Path(temp.name)

        try:
            with urlopen(self.url, timeout=30) as response:
                self.path.write_bytes(response.read())
        except TimeoutError as exc:
            self._cleanup()
            raise OcrWorkerError("OCR_TIMEOUT", "Timed out while downloading attachment.", 504) from exc
        except urllib.error.URLError as exc:
            self._cleanup()
            raise OcrWorkerError("DOWNLOAD_FAILED", str(exc.reason), 502) from exc
        except OSError as exc:
            self._cleanup()
            raise OcrWorkerError("DOWNLOAD_FAILED", str(exc), 502) from exc
        return self.path

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self._cleanup()

    def _cleanup(self) -> None:
        if self.path and self.path.exists():
            self.path.unlink()


def required_string(request: dict[str, Any], key: str, *aliases: str) -> str:
    value = next(
        (request.get(candidate) for candidate in (key, *aliases) if request.get(candidate)),
        "",
    )
    value = str(value or "").strip()
    if not value:
        raise ValueError(f"{key} is required")
    return value


def validate_attachment_url(value: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise OcrWorkerError("BAD_REQUEST", "attachmentUrl must be an absolute http(s) URL", 400)
    if not parsed.path.startswith("/uploads/"):
        raise OcrWorkerError(
            "BAD_REQUEST",
            "attachmentUrl must point to an uploaded file path under /uploads/",
            400,
        )


def average_confidence(lines: list[dict[str, Any]]) -> float | None:
    values = [
        float(item["confidence"])
        for item in lines
        if isinstance(item.get("confidence"), (int, float))
    ]
    if not values:
        return None
    return round(sum(values) / len(values), 4)


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Local Expense OCR HTTP worker")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--max-concurrent-requests", type=int, default=DEFAULT_MAX_CONCURRENT_REQUESTS)
    parser.add_argument("--busy-wait-seconds", type=float, default=DEFAULT_BUSY_WAIT_SECONDS)
    args = parser.parse_args()

    server = ExpenseOcrServer(
        (args.host, args.port),
        ExpenseOcrHandler,
        args.max_concurrent_requests,
        args.busy_wait_seconds,
    )
    print(
        f"Expense OCR worker listening on http://{args.host}:{args.port} "
        f"maxConcurrentRequests={server.max_concurrent_requests}",
        file=sys.stderr,
    )
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
