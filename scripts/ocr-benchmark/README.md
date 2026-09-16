# การทดสอบเปรียบเทียบ OCR

Phase 7A ใช้โฟลเดอร์นี้ในการเปรียบเทียบเครื่องมือ OCR ฟรีกับเอกสารค่าใช้จ่ายจริง ก่อนตัดสินใจเลือกเอนจินสำหรับ OCR Assistant

ลำดับผู้เข้าร่วมทดสอบปัจจุบัน:

1. PaddleOCR
2. Tesseract `tha+eng`
3. EasyOCR `th,en`

PaddleOCR เป็นตัวเลือกแรกที่แนะนำสำหรับโปรเจกต์นี้เพราะภาพตัวอย่างเป็นรูปถ่ายจากโทรศัพท์ที่กระดาษเอียง มีข้อความภาษาไทย/อังกฤษผสม และมีรูปแบบคล้ายใบเสร็จ Benchmark ยังคงเก็บ Tesseract และ EasyOCR เป็น baseline เพื่อให้การตัดสินใจขึ้นกับอัตราการอ่านได้จริง (field hit rate), เวลาในการรัน และต้นทุนการตั้งค่ามากกว่าความชอบส่วนตัว

## ชุดข้อมูล

ไฟล์ `sample_expected.json` ชี้ไปยังภาพเริ่มต้นในโฟลเดอร์ `tmp-receipts` และบันทึก:

- `documentType`: `PaymentOrder` หรือ `Receipt`
- `expected`: ฟิลด์ที่เราต้องการให้ OCR ดึงคืนมา
- `qualityNotes`: ปัญหาที่มองเห็นจากภาพเพื่อช่วยอธิบายความล้มเหลว

ควรเพิ่มภาพจริงอย่างน้อย 20–30 ภาพก่อนเลือกเอนจินสำหรับการใช้งานจริง

## สกีมาผลลัพธ์

แต่ละ runner จะเขียนไฟล์ `results/<engine>.json` ตามรูปแบบตัวอย่าง:

```json
{
  "engine": "paddleocr",
  "results": [
    {
      "file": "S__25034912_0.jpg",
      "documentType": "PaymentOrder",
      "durationMs": 1234.5,
      "rawText": "...",
      "lines": [{ "text": "...", "confidence": 0.92 }],
      "error": null
    }
  ]
}
```

`evaluate_results.py` จะอ่านไฟล์เหล่านั้นแล้วเขียนไฟล์:

- `results/summary.json`
- `results/summary.md`

## การตั้งค่า

ใช้สภาพแวดล้อม Python แยกต่างหาก ห้ามเพิ่มแพ็กเกจ OCR เหล่านี้เข้าเป็น dependency ของแอป ณ ตอนนี้

```powershell
cd C:\Users\Sermpong\Desktop\Document_Benz\HRMS_LINE_LIFF
py -m venv .venv-ocr
.\.venv-ocr\Scripts\activate
python -m pip install --upgrade pip
```

ติดตั้งเฉพาะแพ็กเกจที่ต้องการทดสอบ

### PaddleOCR

PaddleOCR อาจต้องใช้สภาพแวดล้อมสะอาดเพราะ dependency ของ Paddle/PyTorch/Transformers อาจขัดกัน

```powershell
python -m pip install paddleocr
python -m pip install paddlepaddle
python scripts\ocr-benchmark\run_paddleocr.py
```

ถ้าการติดตั้งแบบ CPU ช้าหรือไม่สำเร็จ ให้ดูตารางการติดตั้งอย่างเป็นทางการของ PaddleOCR/PaddlePaddle สำหรับเวอร์ชัน Python และ CUDA ของคุณ

หมายเหตุ: runner ตั้ง `enable_mkldnn=False` สำหรับ CPU inference เพื่อลดโอกาสเจอ oneDNN/MKLDNN crash บน Windows/CPU บางชุด
runner จะสร้าง PaddleOCR engine ครั้งเดียวต่อ process แล้ว reuse กับทุกภาพ เพื่อให้ runtime ใกล้ production worker ที่ warm model ไว้แล้วมากขึ้น

### Tesseract

ติดตั้งไบนารี Tesseract และข้อมูลฝึกภาษาไทยก่อน แล้วรัน:

```powershell
python scripts\ocr-benchmark\run_tesseract.py --lang tha+eng
```

### EasyOCR

EasyOCR จะดาวน์โหลดโมเดลเมื่อรันครั้งแรก โหมด CPU ถูกใช้เป็นค่าเริ่มต้นใน benchmark นี้

```powershell
python -m pip install easyocr
python scripts\ocr-benchmark\run_easyocr.py --lang th,en
```

## รันทั้งหมด

```powershell
python scripts\ocr-benchmark\run_all.py --engines paddleocr,tesseract,easyocr
```

รันตัวอย่างเดียวเพื่อทดสอบการตั้งค่า:

```powershell
python scripts\ocr-benchmark\run_all.py --engines paddleocr --limit 1
```

ประเมินไฟล์ผลลัพธ์ที่มีอยู่:

```powershell
python scripts\ocr-benchmark\evaluate_results.py
```

## Phase 7B Preprocess Variants

สร้างรูปสำเนาสำหรับทดสอบ preprocessing โดยไม่แตะไฟล์ต้นฉบับ:

```powershell
python scripts\ocr-benchmark\preprocess_images.py --variants resize-1000,gray-sharpen-1000,contrast-1000
```

ผลลัพธ์จะอยู่ใน:

```text
scripts/ocr-benchmark/preprocessed/<variant>/
  expected.json
  manifest.json
  *.jpg
```

รัน PaddleOCR กับ variant ใด variant หนึ่ง:

```powershell
python scripts\ocr-benchmark\run_paddleocr.py `
  --expected scripts\ocr-benchmark\preprocessed\resize-1000\expected.json `
  --results-dir scripts\ocr-benchmark\results\preprocess `
  --run-label paddleocr-resize-1000 `
  --profile fast

python scripts\ocr-benchmark\evaluate_results.py `
  --expected scripts\ocr-benchmark\preprocessed\resize-1000\expected.json `
  --results-dir scripts\ocr-benchmark\results\preprocess
```

ลองเทียบชุดที่ควรเริ่มก่อน:

```powershell
python scripts\ocr-benchmark\preprocess_images.py --variants resize-800,resize-1000,contrast-1000,gray-sharpen-1000
```

จากนั้นรัน `run_paddleocr.py` ทีละ variant โดยเปลี่ยน `--expected` และ `--run-label`

Variant ที่มีให้:

- `resize-1400`
- `resize-1000`
- `resize-800`
- `contrast-1000`
- `gray-sharpen-1000`
- `threshold-1000`

## กฎการตัดสินใจ

เลือกเอนจินหลักเมื่อรายงานสรุปแสดงว่า:

- อัตราการจับฟิลด์ (field hit rate) สูงสุดบน `PaymentOrder` และ `Receipt`
- เวลาเฉลี่ยที่ยอมรับได้บนเครื่องเป้าหมาย
- การตั้งค่ามีความเสถียรบน Windows
- มีกลยุทธ์สำรองที่ชัดเจน

สำหรับ Phase 7E parser จะคืน suggestion พร้อม `confidence` และ `source` สำหรับฟิลด์ที่อ่านได้:

- `billNo`
- `expenseDate`
- `amount`
- `fuelLiters`
- `vehicleNo`
- `plateNo`
- `driverName`
- `transportNo`
- `origin`
- `customerName`
- `tripCount`
- `merchantName`
- `receiptTid`
- `receiptBatch`
- `receiptMid`
- `receiptTrace`

ฟิลด์ข้อความอิสระ เช่น `driverName`, `origin`, `customerName`, `merchantName` ต้องให้ user ตรวจและยืนยันก่อน submit เสมอ
