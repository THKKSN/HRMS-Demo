# 07 — Authentication & Account Linking Flow

## 🔑 ทางเลือกการ Login

ระบบรองรับ 2 วิธี:

| วิธี | ใช้เมื่อไหร่ |
|------|-------------|
| **A. LINE Login (LIFF)** | พนักงานเปิดจาก rich menu / link ใน LINE — แนะนำเป็นทางหลัก |
| **B. Email + Password** | Admin Dashboard บนเว็บ / กรณีไม่มี LINE |

## 📲 Flow A — Login ผ่าน LINE (ครั้งแรก = ต้อง Link)

```
Employee เปิด LIFF
   │
   ▼
liff.init({ liffId })  →  liff.isLoggedIn()?
   │ No
   ├──► liff.login()  → กลับมาที่เดิมพร้อม session
   │ Yes
   ▼
liff.getAccessToken()  →  POST /auth/line { accessToken }
   │
   ▼
BE: verify LINE access token และดึง LINE profile
   │
   ▼
ค้นหา employee จาก line_user_id
   │
   ├── เจอ → issue JWT → 200 OK → FE redirect /dashboard
   │
   └── ไม่เจอ → 409 ACCOUNT_NOT_LINKED { lineUserId }
                 │
                 ▼
        FE แสดงหน้า "ผูกบัญชี"
        กรอก: รหัสพนักงาน (ไม่ใช้เลขบัตรประชาชนแล้ว)
                 │
                 ▼
        POST /auth/link/preview { accessToken, employeeCode }
        → BE verify LINE ก่อน แล้วค่อยค้นหาพนักงาน
        → 200 { fullName, previewToken, expiresIn: 300 }   ยังไม่ส่ง OTP
                 │
                 ▼
        FE แสดงชื่อ-นามสกุลเต็ม ให้ผู้ใช้ยืนยัน
                 │
                 ├── กด "ไม่ใช่ กลับไปแก้ไข" → ล้าง preview กลับไปกรอกใหม่
                 │
                 └── กด "ใช่ นี่คือฉัน"
                          │
                          ▼
        POST /auth/otp/request { accessToken, previewToken }
        → BE verify LINE + ตรวจ previewToken + เช็กสถานะพนักงานใหม่
        → ส่ง OTP ทาง LINE OA push message
                 │
                 ▼
        กรอก OTP 6 หลัก → POST /auth/link
                 │
                 ▼
        BE: update employee.line_user_id = ... → issue JWT → done
```

### ทำไมต้องมีขั้น preview

รหัสพนักงานเป็น lookup key ที่คนอื่นอาจเดาได้ง่ายกว่าเลขบัตรประชาชน การให้ผู้ใช้
เห็นชื่อ-นามสกุลแล้วยืนยันก่อน ทำให้คนที่กรอกรหัสผิดรู้ตัวก่อนที่ OTP จะถูกส่งไป
หา LINE ของคนอื่น และทำให้ OTP ถูกส่งเฉพาะเมื่อมีการยืนยันตัวตนอย่างชัดเจน

### preview token

| คุณสมบัติ | ค่า |
|---|---|
| กลไก | ASP.NET Core Data Protection (`ITimeLimitedDataProtector`) |
| purpose | `Hrms.Auth.LineLinkPreview.v1` |
| อายุ | 5 นาที |
| ผูกกับ | `employeeId` + `lineUserId` ที่ verify แล้ว |
| เก็บที่ | ไม่เก็บ — payload อยู่ในตัว token ไม่ต้องใช้ DB หรือ Redis จึงไม่มี migration |
| key ring | ไฟล์นอกโฟลเดอร์ publish ตั้งผ่าน `DataProtection:KeysPath` |

`/auth/otp/request` ตรวจ 3 อย่างก่อนส่ง OTP ทุกครั้ง ไม่เชื่อ token เพียงลำพัง:

1. LINE access token ใช้ได้จริง
2. `previewToken` ถอดรหัสผ่าน ยังไม่หมดอายุ และ `lineUserId` ในนั้นตรงกับที่เพิ่ง verify
3. พนักงานยัง `is_active` และยังไม่ถูกผูกบัญชี — เช็กสดใหม่ เพราะสถานะอาจเปลี่ยน
   ในช่วง 5 นาทีระหว่าง preview กับตอนกดยืนยัน

ทุกกรณีที่ไม่ผ่านข้อ 2 หรือ 3 คืน `INVALID_OR_EXPIRED_PREVIEW` เหมือนกันหมด
และไม่ส่ง token หรือข้อมูลพนักงานกลับไปใน error

### รหัสพนักงาน — รูปแบบที่เก็บและการค้นหา

```text
รูปแบบที่เก็บใน DB (canonical form)
  - ตัวเลขล้วน ที่ตัด 0 นำหน้าแล้วเหลือ 3-4 หลัก → เติม 0 ให้ครบ 5 หลัก
        '123' → '00123'    '7644' → '07644'
  - ตัวเลขล้วนอื่น ๆ (1-2 หลัก หรือ 5 หลักขึ้นไป) → ตัด 0 นำหน้าออก ไม่เติม
  - รหัสที่มีตัวอักษร (เช่น 'SYSADMIN') → ไม่แตะเลย

การค้นหาตอนผูกบัญชี (ทำที่ฝั่ง server เท่านั้น)
  - normalize ค่าที่กรอกเป็น canonical form แล้วเทียบ = ตรง ๆ ครั้งเดียว
        กรอก '123' / '0123' / '00123' → '00123' → เจอคนเดียวกัน
  - ฝั่ง LIFF trim เท่านั้น ห้ามเติม/ตัด 0 เอง
    ถ้าสองฝั่ง normalize ไม่ตรงกัน พนักงานจะล็อกอินไม่ได้แบบไม่มี error ให้เห็น
```

- ตัวตัดสินคือ `EmployeeCodeNormalizer` ฝั่ง API ซึ่งเป็นคู่แฝดของ SQL
  ใน `scripts/pad-employee-code-to-5.sql` ที่แปลงข้อมูลเดิม (รันครั้งเดียว
  ไม่ใช่ EF migration) — แก้ต้องแก้คู่กัน
- ทุกทางที่เขียนรหัสใหม่ (Piswin import, admin สร้างพนักงาน) normalize ก่อนบันทึก
  ไม่งั้น canonical form จะเพี้ยนกลับ
- `unique index ix_employees_employee_code` เป็นตัวรับประกันว่าไม่มีรหัสซ้ำ
- duplicate check ตอน import ใช้รหัสพนักงานเท่านั้น ไม่เช็ก `national_id`
  ถ้าวันหนึ่งต้องกันคนซ้ำด้วยเลขบัตร ต้องเพิ่ม unique index ที่ `national_id` ด้วย

### การ deploy

`POST /auth/otp/request` เปลี่ยน contract (`nationalId` → `previewToken`) เป็น
breaking change จึงต้อง **deploy API กับ LIFF พร้อมกันรอบเดียว** และต้องแปลง
`employee_code` ใน DB ให้เป็น canonical form เสร็จก่อน API ตัวใหม่ขึ้น
ถ้า deploy API ใหม่ทับข้อมูลที่ยังไม่แปลง พนักงานที่รหัส 3-4 หลักจะผูกบัญชีไม่ได้

## 🔐 LINE Access Token Verification (BE side)

API เรียก `GET https://api.line.me/oauth2/v2.1/verify?access_token=...`
เพื่อตรวจว่า token ยังไม่หมดอายุและเป็นของ LINE channel ที่กำหนด จากนั้นเรียก
`GET https://api.line.me/v2/profile` ด้วย Bearer token เพื่อรับ LINE user profile
ก่อนค้นหา/ผูกบัญชี

ทั้ง `/auth/link/preview` และ `/auth/otp/request` verify LINE access token **ก่อน**
แตะตาราง `employees` เสมอ เพื่อไม่ให้ใช้ endpoint เหล่านี้เดารหัสพนักงานหรือ
ไล่ดูว่ามีพนักงานคนไหนอยู่ในระบบ โดยไม่มี access token ที่ใช้ได้จริง

## 🪪 JWT Claims
```json
{
  "sub": "<employee_id>",
  "line_uid": "<line_user_id>",
  "name": "<employee_name>",
  "company_id": "<company_id>",
  "department_id": "<department_id>",
  "roles": "<roles>",
  "iat": 1717900000,
  "exp": 1717900900,
  "iss": "hrms-api",
  "aud": "hrms-liff"
}
```

## ♻️ Refresh Token
- Refresh token เก็บเป็น hash ในตาราง `refresh_tokens`
- Rotate ทุกครั้งที่ใช้ (one-time use)
- client ล้าง token ของ HRMS เมื่อ logout

## 🚪 Logout
- `POST /auth/logout` รับ refresh token เพื่อ revoke session ของ HRMS
- FE ล้าง state/token ของ HRMS; การออกจาก LINE LIFF เป็นพฤติกรรมที่ client กำหนด

## 🛡️ Security Notes
- ตรวจ `client_id` และวันหมดอายุของ LINE access token ก่อนใช้ profile — ป้องกันใช้ token จาก channel อื่น
- รหัสพนักงานเป็นเพียง lookup key สำหรับขอ preview ไม่ใช่รหัสผ่าน — LINE access token
  และ OTP 6 หลักยังเป็นตัวยืนยันตัวตนจริงทั้งคู่
- รหัสพนักงาน, ชื่อที่ preview และ preview token ห้ามเก็บใน local/session storage,
  query string, telemetry, log หรือส่งกลับใน error — ฝั่ง LIFF เก็บไว้ใน React state
  เท่านั้น มีเพียง LINE access token ที่อยู่ใน session storage สำหรับหน้า OTP
- `/auth/link/preview` คืนเฉพาะ `fullName`, `previewToken`, `expiresIn` ไม่คืน
  employee id, เลขบัตรประชาชน, เบอร์โทร, อีเมล, แผนก, บริษัท หรือ LINE user id
- OTP: 6 หลัก, เก็บแบบ hash ใน distributed cache และหมดอายุใน 5 นาที
- IP rate limit สำหรับ auth แบบเข้มงวด: 5 requests/นาที/IP ครอบทั้ง `link/preview`,
  `otp/request` และ `link`
- ผู้ที่ไม่พบข้อมูล, inactive หรือพบรหัสซ้ำ จะได้รับ `EMPLOYEE_NOT_FOUND` แบบเดียวกัน
  และระบบจะไม่แสดงชื่อหรือส่ง OTP
- Data Protection key ring ต้องอยู่นอกโฟลเดอร์ publish และรวมอยู่ในขั้นตอน backup
  ของเซิร์ฟเวอร์ ถ้า key หาย preview token ที่ออกไปแล้วใช้ไม่ได้ทั้งหมด
  (ผู้ใช้ต้องกรอกรหัสพนักงานใหม่) — ห้ามลบ key ตอน rollback
