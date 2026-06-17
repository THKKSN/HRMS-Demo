# HRMS on LINE (LIFF / Mini App)

ระบบบริหารทรัพยากรบุคคล (HRMS) ที่ทำงานบน LINE ผ่าน LIFF / LINE Mini App
ให้พนักงานสามารถ **ลางาน / ดูสลิป / ดูวันลาคงเหลือ / ลงเวลา** ได้ด้วยตนเองผ่าน LINE
โดยมี Workflow Approval ผ่าน **หัวหน้าแผนก → HR (Head Quarter) → แจ้งผู้บริหาร**

> **เป้าหมาย**: ลดงาน manual ของ HR, ลดการใช้ใบลากระดาษ, พนักงานใช้งานง่ายผ่าน LINE ที่ทุกคนมีอยู่แล้ว

---

## 📚 เอกสารแยกตามหัวข้อ

| # | ไฟล์ | เนื้อหา |
|---|------|---------|
| 1 | [docs/01-overview.md](docs/01-overview.md) | ภาพรวม, Scope, Personas, User Stories |
| 2 | [docs/02-tech-stack.md](docs/02-tech-stack.md) | ภาษา / Framework / Tools ที่แนะนำ พร้อมเหตุผล |
| 3 | [docs/03-architecture.md](docs/03-architecture.md) | สถาปัตยกรรมระบบ + Diagram |
| 4 | [docs/04-features.md](docs/04-features.md) | Feature ทั้งหมด + ไอเดียเพิ่มเติม |
| 5 | [docs/05-database-schema.md](docs/05-database-schema.md) | โครงสร้างฐานข้อมูล |
| 6 | [docs/06-api-spec.md](docs/06-api-spec.md) | API Endpoints (REST) |
| 7 | [docs/07-auth-flow.md](docs/07-auth-flow.md) | การ Login / Bind LINE Account |
| 8 | [docs/08-ui-screens.md](docs/08-ui-screens.md) | รายการหน้าจอ LIFF + Dashboard |
| 9 | [docs/09-roadmap.md](docs/09-roadmap.md) | Roadmap / Milestone / Phase |
| 10 | [docs/10-deployment.md](docs/10-deployment.md) | Deployment + DevOps |
| 11 | [docs/11-architecture-diagrams.md](docs/11-architecture-diagrams.md) | **Architecture diagrams ทุกมุมมอง** (C4, Sequence, ERD, State, Deployment) |

---

## 🚀 TL;DR — Stack ที่แนะนำ

| Layer | เทคโนโลยี |
|---|---|
| **LIFF / Mini App (Frontend)** | **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** |
| **State / Data Fetch** | TanStack Query (React Query) + Zustand |
| **Backend API** | **.NET 8 Web API (C#)** *(เข้ากับ stack เดิมที่คุณใช้อยู่)* หรือ NestJS (TypeScript) |
| **Database** | MySQL 8 + Redis (cache / session) |
| **ORM** | Entity Framework Core (ถ้าใช้ .NET) / Prisma (ถ้าใช้ Node) |
| **LINE Integration** | LINE Login + LIFF SDK v2 + Messaging API (push approval notification) |
| **Auth** | JWT + LINE ID Token verification + bind employee code |
| **Dashboard (Web Admin)** | Next.js + Recharts / Apache ECharts + AG Grid |
| **Job / Queue** | Hangfire (.NET) / BullMQ (Node) — ส่งแจ้งเตือน, สรุปสลิป |
| **Infra** | Docker + Docker Compose → Production: Azure Container Apps / AWS ECS / VM + Nginx |
| **CI/CD** | GitHub Actions |
| **Monitoring** | Serilog + Seq / Grafana Loki + Sentry (frontend error) |

> เหตุผลเลือก **.NET 8 + Next.js** → ตรงกับ stack ที่ทีมคุณมี (KrungthaiApi, Payment API เป็น .NET) ทำให้ reuse คน/library ได้ทันที

---

## 🗂️ โครงสร้างโปรเจคที่แนะนำ (Monorepo)

```
hrms-line/
├── apps/
│   ├── liff-web/              # Next.js — LIFF Mini App (พนักงานใช้)
│   ├── admin-web/             # Next.js — Dashboard HR/หัวหน้า
│   └── api/                   # .NET 8 Web API
│       ├── Hrms.Api/
│       ├── Hrms.Application/  # Use cases / CQRS
│       ├── Hrms.Domain/       # Entities / Value Objects
│       └── Hrms.Infrastructure/ # EF Core / LINE SDK / Redis
├── packages/
│   ├── shared-types/          # TypeScript types ใช้ร่วม FE
│   └── ui-kit/                # shadcn-based components
├── infra/
│   ├── docker-compose.yml
│   └── k8s/ (optional)
├── docs/                      # 📖 เอกสารทั้งหมด
└── README.md
```

---

## 🎯 Feature หลัก (สั้น ๆ ดูเต็มที่ [04-features.md](docs/04-features.md))

- ✅ ลางาน (ลาป่วย/ลากิจ/ลาพักร้อน/ลาคลอด) พร้อมแนบไฟล์ใบรับรองแพทย์
- ✅ ดูวันลาคงเหลือ + ประวัติการลา
- ✅ ลงเวลาเข้า-ออก (Check-in/out ผ่าน GPS + Selfie optional)
- ✅ ดูสลิปเงินเดือน (PDF + Download)
- ✅ Workflow Approval — หัวหน้า → HR → แจ้งผู้บริหาร
- ✅ Push Notification ผ่าน LINE OA ทุกขั้นตอน
- ✅ Dashboard สำหรับ HR/หัวหน้า: สรุปการลา, อัตราการมาทำงาน, OT, สถิติรายเดือน

### 💡 ไอเดียเพิ่มเติม (Nice to have)
- 📊 **AI Insight** — ทำนายแนวโน้มการลาออก (turnover prediction)
- 📝 **OKR / KPI Tracking** บน LINE
- 💬 **Chatbot HR FAQ** ตอบคำถามนโยบายบริษัทอัตโนมัติ
- 🎉 **Birthday / Anniversary** ส่ง flex message ทักทายอัตโนมัติ
- 📅 **ปฏิทินทีม** ดูว่าวันนี้ใครลา / ใคร WFH
- 🏆 **Reward / Recognition** เพื่อนให้คะแนนชมเชยกัน
- 📄 **e-Document** เซ็นเอกสาร HR ผ่าน LINE (e-signature)
- 🧾 **Expense Claim** เบิกค่าใช้จ่ายพร้อมถ่ายใบเสร็จ OCR
- 🚗 **Booking** จองห้องประชุม / รถบริษัท

---

## 🏁 เริ่มต้นยังไง

1. อ่าน [docs/01-overview.md](docs/01-overview.md) เพื่อเข้าใจ scope
2. ตัดสินใจ stack ตาม [docs/02-tech-stack.md](docs/02-tech-stack.md)
3. ดู [docs/03-architecture.md](docs/03-architecture.md) แล้วร่าง diagram ใน drawio
4. เริ่ม MVP จาก Phase 1 ใน [docs/09-roadmap.md](docs/09-roadmap.md)

---

**Author:** thkksn  •  **Last update:** 2026-06-10
