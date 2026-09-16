# GLOSSARY — ศัพท์บังคับสำหรับการแปล

> ใช้กับทุกครั้งที่สั่ง AI แปล และแนบเป็นชีต `GLOSSARY` ในไฟล์ตรวจ (`pnpm i18n:export`)
> คำเดียวกันต้องแปลเหมือนกันทุกหน้า — ถ้าจะเปลี่ยนคำ ให้เปลี่ยนที่นี่ก่อนแล้วค่อยไล่แก้คำแปล
> สถานะ: **ร่างตั้งต้น** รอคนที่รู้งาน HR ตรวจและเติม (งาน 0.8 ของแผน i18n) · เติมศัพท์ ticket/memo รอบ Phase 1 แล้ว (2026-09-14) คอลัมน์ `id` ของศัพท์รอบนั้นยังเป็นร่าง รอตรวจตอน Phase 5

## ระบบ / โมดูล

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| ใบแจ้งเรื่อง | ticket | tiket | ห้ามใช้ request / report / issue |
| ผู้แจ้ง | requester | pelapor | ทั้งพนักงานภายในและบุคคลภายนอก |
| ผู้แจ้งภายนอก | external reporter | pelapor eksternal | |
| ผู้รับผิดชอบ | assignee | penanggung jawab | คนที่ถูกมอบหมายใบแจ้ง |
| หัวหน้า | supervisor | supervisor | role ระดับหัวหน้างาน |
| บันทึกข้อความ | memo | memo | ห้ามใช้ note |
| เบิกค่าใช้จ่าย | expense claim | klaim biaya | |
| รอบวางบิล | billing batch | batch penagihan | |
| ลงเวลาเข้างาน / ออกงาน | check in / check out | absen masuk / absen keluar | |
| ทำงานล่วงเวลา (OT) | overtime (OT) | lembur (OT) | คงตัวย่อ OT ไว้ทุกภาษา |
| ใบลา | leave request | pengajuan cuti | |
| ยอดวันลาคงเหลือ | leave balance | sisa cuti | |
| กะการทำงาน | shift | shift | |
| วันหยุด | holiday | hari libur | |
| สลิปเงินเดือน | payslip | slip gaji | |

## ประเภทการลา

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| ลาพักร้อน | annual leave | cuti tahunan | |
| ลากิจ | personal leave | izin pribadi | |
| ลาป่วย | sick leave | cuti sakit | |
| ลาคลอด | maternity leave | cuti melahirkan | |

## สถานะ (ต้องตรงกับ `status.*` ใน messages)

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| เรื่องใหม่ | new | baru | TicketStatus.Open |
| มอบหมายแล้ว | assigned | ditugaskan | |
| กำลังดำเนินการ | in progress | sedang diproses | |
| รอข้อมูล | waiting for info | menunggu informasi | |
| รอตรวจรับ | awaiting acceptance | menunggu verifikasi | TicketStatus.Resolved — ห้ามใช้ resolved ตรง ๆ เพราะผู้ใช้ไทยเข้าใจว่าคือ "รอตรวจ" |
| ปิดงานแล้ว | closed | selesai | |
| ปฏิเสธ | rejected | ditolak | |
| ยกเลิก | cancelled | dibatalkan | สะกด cancelled (British) ให้ตรงกันทุกที่ |
| รออนุมัติ | pending approval | menunggu persetujuan | |
| อนุมัติแล้ว | approved | disetujui | |
| ไม่อนุมัติ | not approved | tidak disetujui | ใช้กับ memo — ต่างจาก "ปฏิเสธ" ของ ticket |
| แบบร่าง | draft | draf | |

## ปุ่ม / การกระทำทั่วไป

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| บันทึก | Save | Simpan | |
| ยกเลิก (ปุ่ม) | Cancel | Batal | ปุ่มปิด dialog — คนละความหมายกับสถานะ "ยกเลิก" |
| ส่งคำขอ | Submit | Kirim | |
| ยืนยัน | Confirm | Konfirmasi | |
| ลบ | Delete | Hapus | must_review เสมอ |
| แก้ไข | Edit | Ubah | |
| ค้นหา | Search | Cari | |
| กำลังโหลด... | Loading... | Memuat... | |
| ไม่พบข้อมูล | No data | Tidak ada data | |
| ออกจากระบบ | Log out | Keluar | |

## งานในใบแจ้งเรื่อง (เติมรอบ Phase 1)

| ไทย | en | id | หมายเหตุ |
|---|---|---|---|
| หมวด / หมวดย่อย / หัวข้อ | category / sub-category / subject | kategori / subkategori / subjek | ลำดับ 3 ชั้นของ taxonomy — ห้ามสลับคำ |
| ความเร่งด่วน | priority | prioritas | ค่า: ต่ำ/กลาง/ด่วน/ด่วนมาก = Low/Medium/High/Critical |
| กล่องงาน | inbox | kotak masuk | หน้ารวมใบแจ้งของหัวหน้า/HR |
| รับเรื่อง | receive | terima | หัวหน้ากดรับใบแจ้งเข้าคิวของตัวเอง |
| จัดประเภท | categorise | kategorikan | แก้หมวด/หัวข้อ/ความเร่งด่วนของใบที่รับมาแล้ว |
| มอบหมาย / เปลี่ยนผู้รับผิดชอบ | assign / change assignee | tugaskan / ubah penanggung jawab | |
| รับงานไปทำ | pick up | ambil | งานในคิวกลางที่ใครก็หยิบได้ |
| ขอข้อมูลเพิ่ม | request info | minta informasi | ส่งกลับไปถามผู้แจ้ง ไม่ใช่การปฏิเสธ |
| ส่งตรวจรับ | submit for review | ajukan untuk ditinjau | ผู้รับผิดชอบส่งงานที่ทำเสร็จให้ตรวจ |
| ส่งกลับแก้ไข | send back for changes | kembalikan untuk diperbaiki | ผู้ตรวจไม่รับ ให้กลับไปทำต่อ |
| ตรวจรับ / ยืนยันจบงาน | accept / confirm completion | terima / konfirmasi selesai | ผู้แจ้งเป็นคนยืนยัน |
| เหตุผลปิดงาน | closeout reason | alasan penutupan | แทนคำเดิม "ประเภทปัญหา" ที่กำลังเลิกใช้ |
| ขอยกเลิกใบแจ้ง | request cancellation | minta pembatalan | ต้องผ่านการอนุมัติ ไม่ใช่กดยกเลิกเอง |
| การ์ดกิจกรรม / บอร์ด | activity card / board | kartu aktivitas / papan | บันทึกความคืบหน้าระหว่างทำงาน |
| ปักหมุด | pin | sematkan | การ์ดที่ปักหมุดขึ้นบนสุดของบอร์ด |
| ทีมงาน / ผู้รับผิดชอบหลัก | team / main assignee | tim / penanggung jawab utama | สมาชิกทีมลงการ์ดได้ แต่ส่งตรวจรับได้เฉพาะผู้รับผิดชอบหลัก |
| ขั้นตอน (ของ workflow) | step | langkah | ชื่อขั้นตอนที่ HR ตั้งเองไม่แปล — แปลเฉพาะขั้นตอนมาตรฐาน |
| หลักฐาน | evidence | bukti | รูป/ไฟล์แนบตอนแจ้งและตอนปิดงาน |

## กติกาการแปลที่ไม่ใช่คำศัพท์

- ปีในภาษาไทยเป็นพุทธศักราชโดย formatter อยู่แล้ว — **ห้าม** เขียน พ.ศ./ค.ศ. ลงในข้อความ
- คำว่า "น." ท้ายเวลา (เช่น 08:30 น.) ภาษาอื่นไม่มี — ให้ formatter จัดการ ไม่ต้องแปล
- ชื่อระบบ **TBG Assistant** ไม่แปล
- ชื่อเฉพาะที่ HR กรอกเอง (ชื่อแผนก, ตำแหน่ง, ประเภทใบแจ้ง) ไม่อยู่ในไฟล์นี้ — แปลผ่านคอลัมน์ `NameEn`/`NameId` ใน Phase M
