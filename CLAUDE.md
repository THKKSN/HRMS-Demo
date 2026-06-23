# CLAUDE.md — HRMS LINE LIFF Project

## ภาษาที่ใช้สื่อสาร

**ตอบเป็นภาษาไทยเสมอ** สำหรับโปรเจกต์นี้ ยกเว้นชื่อ code, technical term, หรือ error message ที่เป็นภาษาอังกฤษตามต้นฉบับ

## Soft Delete — ห้ามลบข้อมูลออกจาก Database จริง

การ "ลบ" ข้อมูลในโปรเจกต์นี้ให้ใช้ **Soft Delete** เสมอ คือเปลี่ยน `IsActive = false` แทนการ `DELETE` row ออกจาก database

- ไม่มี `DELETE` endpoint หรือ `db.Remove()` สำหรับ entity หลัก (Employee, Company, Department, LeaveType ฯลฯ)
- ใช้ `ToggleStatus` / `Toggle...StatusCommand` pattern แทน
- Query ทั่วไปให้ filter `WHERE is_active = true` เป็น default เสมอ
- ถ้า UI ต้องการ "ลบ" ให้เรียก PATCH `/{id}/status` พร้อม `{ "isActive": false }`
