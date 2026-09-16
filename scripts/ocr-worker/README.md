# Expense OCR Worker

Local HTTP worker for Phase 7C. Keep this process running beside the API so PaddleOCR stays warm between jobs.

Flow:

```text
LIFF -> Cloudflare/API -> Hangfire/API -> http://localhost:8017 OCR worker
```

`WorkerBaseUrl` should stay local because only the API calls the worker. `attachmentUrl` should be a public API URL, such as the Cloudflare tunnel URL, so the worker can download the uploaded image from the API static files endpoint.

Current dev API shape:

```text
API base:        https://its-called-earrings-johns.trycloudflare.com/v1
OCR result API:  https://its-called-earrings-johns.trycloudflare.com/v1/expenses/{expenseId}/ocr-result
Uploaded file:   https://its-called-earrings-johns.trycloudflare.com/uploads/expenses/{yyyy}/{MM}/{file}
Worker API:      http://localhost:8017/v1/ocr/expense
```

The worker never calls `/v1/expenses/{expenseId}/ocr-result`; that endpoint is for LIFF to poll the saved OCR result from the API. The API/Hangfire job calls the worker and passes an `attachmentUrl` pointing to `/uploads/...`.

```powershell
.\.venv-ocr\Scripts\python.exe scripts\ocr-worker\expense_ocr_worker.py --host 127.0.0.1 --port 8017 --max-concurrent-requests 1
```

Then enable the API connector:

```json
{
  "ExpenseOcr": {
    "Enabled": true,
    "WorkerBaseUrl": "http://localhost:8017",
    "WorkerBaseUrls": [ "http://localhost:8017" ],
    "Provider": "PaddleOCR",
    "Profile": "fast",
    "MaxSide": 800,
    "PreprocessVariant": "resize-800",
    "QueueName": "ocr",
    "MaxConcurrentWorkerRequests": 1,
    "WorkerBusyRetryDelaySeconds": 30,
    "StaleProcessingMinutes": 10,
    "EnableResultCache": true,
    "MaxRetryAttempts": 3
  }
}
```

For a local worker pool, run one worker process per port and list every endpoint:

```powershell
.\.venv-ocr\Scripts\python.exe scripts\ocr-worker\expense_ocr_worker.py --host 127.0.0.1 --port 8017 --max-concurrent-requests 1
.\.venv-ocr\Scripts\python.exe scripts\ocr-worker\expense_ocr_worker.py --host 127.0.0.1 --port 8018 --max-concurrent-requests 1
```

```json
{
  "ExpenseOcr": {
    "WorkerBaseUrls": [
      "http://localhost:8017",
      "http://localhost:8018"
    ]
  },
  "Hangfire": {
    "Queues": [ "ocr" ],
    "WorkerCount": 2
  }
}
```

Health check:

```powershell
curl http://localhost:8017/health
```

Expected health shape:

```json
{
  "status": "ok",
  "workerVersion": "expense-ocr-worker-0.1",
  "modelVersion": "PP-OCRv5-th-mobile-rec",
  "modelLoaded": false,
  "busy": false,
  "running": 0,
  "maxConcurrentRequests": 1
}
```

API contract:

```text
POST /v1/ocr/expense
```

Request body:

```json
{
  "expenseClaimId": "guid",
  "expenseOcrResultId": "guid",
  "attachmentUrl": "https://its-called-earrings-johns.trycloudflare.com/uploads/expenses/2026/08/file.jpg",
  "documentType": "Receipt",
  "provider": "PaddleOCR",
  "profile": "fast",
  "maxSide": 800
}
```
