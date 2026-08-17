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
        กรอก: เลขบัตรประชาชน 13 หลักที่ผ่าน checksum
                 │
                 ▼
        POST /auth/otp/request { accessToken, nationalId }
        → BE ตรวจพบพนักงาน active เพียง 1 คน แล้วส่ง OTP กลับทาง LINE OA push message
                 │
                 ▼
        กรอก OTP 6 หลัก → POST /auth/link
                 │
                 ▼
        BE: update employee.line_user_id = ... → issue JWT → done
```

## 🔐 LINE Access Token Verification (BE side)

API เรียก `GET https://api.line.me/oauth2/v2.1/verify?access_token=...`
เพื่อตรวจว่า token ยังไม่หมดอายุและเป็นของ LINE channel ที่กำหนด จากนั้นเรียก
`GET https://api.line.me/v2/profile` ด้วย Bearer token เพื่อรับ LINE user profile
ก่อนค้นหา/ผูกบัญชี

การขอ OTP ยืนยันตัวตนจะตรวจเลขบัตรประชาชนแบบ ASCII 13 หลัก โดยใช้ checksum
ไทย `(11 - (sum % 11)) % 10` (น้ำหนัก 13 ถึง 2 สำหรับ 12 หลักแรก) ทั้งฝั่ง LIFF
และ API โดย API เป็นผู้ตัดสินผลสุดท้าย

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
- เลขบัตรประชาชนเป็นเพียง lookup key สำหรับขอ OTP ไม่ใช่รหัสผ่าน; ห้ามเก็บใน local/session storage, query string, telemetry, log หรือส่งกลับใน error
- OTP: 6 หลัก, เก็บแบบ hash ใน distributed cache และหมดอายุใน 5 นาที
- IP rate limit สำหรับ auth แบบเข้มงวด: 5 requests/นาที/IP
- ผู้ที่ไม่พบข้อมูล, inactive หรือพบเลขบัตรซ้ำ จะได้รับผลตรวจสอบพนักงานแบบเดียวกัน และระบบจะไม่สร้างหรือส่ง OTP
