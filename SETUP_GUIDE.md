# 🏥 WFME Competency Analysis — คู่มือเชื่อมต่อ Google Sheets

## สถาปัตยกรรมระบบ

```
┌─────────────────┐     HTTPS/JSON      ┌─────────────────────┐     Read/Write     ┌──────────────┐
│   React App     │ ◄──────────────────► │  Google Apps Script  │ ◄────────────────► │ Google Sheets│
│  (Frontend)     │   fetch() API call   │  (Backend API)       │   SpreadsheetApp   │  (Database)  │
└─────────────────┘                      └─────────────────────┘                    └──────────────┘
```

## ไฟล์ทั้งหมด

| ไฟล์ | หน้าที่ |
|------|---------|
| `Google_Apps_Script_Code.js` | Backend API — วางใน Google Apps Script |
| `WFME_GoogleSheets_Dashboard.jsx` | Frontend — ใช้ไฟล์นี้ไฟล์เดียว (แทนไฟล์เก่าทั้งหมด) |

---

## ขั้นตอนติดตั้ง (10 นาที)

### ขั้นตอนที่ 1: สร้าง Google Apps Script

1. ไปที่ **https://script.google.com**
2. กด **"โปรเจกต์ใหม่"**
3. ลบโค้ดเดิมทั้งหมด
4. คัดลอกเนื้อหาจากไฟล์ `Google_Apps_Script_Code.js` ทั้งหมด → วางลงไป
5. ตั้งชื่อโปรเจกต์ เช่น "WFME API"
6. กด **💾 Save** (Ctrl+S)

### ขั้นตอนที่ 2: Deploy เป็น Web App

1. กด **Deploy → New deployment**
2. คลิก ⚙️ เลือก **"Web app"**
3. ตั้งค่า:
   - **Description:** WFME API v1
   - **Execute as:** `Me` (ตัวเอง)
   - **Who has access:** `Anyone` (ทุกคน)
4. กด **Deploy**
5. กด **Authorize access** → เลือกบัญชี Google → Allow
6. **คัดลอก Web App URL** ที่ได้ (หน้าตาประมาณ `https://script.google.com/macros/s/AKfycbx.../exec`)

### ขั้นตอนที่ 3: ใส่ URL ใน React

เปิดไฟล์ `WFME_GoogleSheets_Dashboard.jsx` แก้บรรทัดที่ 10:

```javascript
// เปลี่ยนจาก:
const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// เป็น URL ที่คัดลอกมา:
const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec";
```

### ขั้นตอนที่ 4: ทดสอบ

เปิด Dashboard → หน้า Login ควรแสดง **"Google Sheets ✓"** สีเขียว

---

## Google Sheets ที่สร้างอัตโนมัติ

เมื่อเรียก API ครั้งแรก ระบบจะสร้าง Spreadsheet ชื่อ **"WFME_Database"** ใน Google Drive ของคุณ ประกอบด้วย 6 แผ่น:

| Sheet | ข้อมูล | Columns |
|-------|--------|---------|
| `users` | บัญชีผู้ใช้ | id, email, password_hash, name, role, avatar, created_at, last_login |
| `plo_data` | PLO Achievement | plo_id, plo_name, y1-y6, employer, graduate, updated_at |
| `nl_data` | ผลสอบ NL | exam_name, pass_rate, mean_score, national_avg, updated_at |
| `course_data` | คุณภาพรายวิชา | course_name, clo_achieve, reliability, difficulty, discrimination, pass_rate, updated_at |
| `trend_data` | แนวโน้มรายปี | year, graduation, nl_pass, employer_score, retention, updated_at |
| `audit_log` | บันทึกการใช้งาน | timestamp, user_email, action, details, ip |

---

## บัญชีทดสอบเริ่มต้น

| บทบาท | Email | Password |
|--------|-------|----------|
| 👑 ประธานหลักสูตร | chair@med.edu | chair123 |
| 🎓 อาจารย์ | faculty@med.edu | faculty123 |
| 📋 QA | qa@med.edu | qa1234 |
| ⚙️ Admin | admin@med.edu | admin123 |

---

## การทำงานของระบบ

### Login Flow
```
User กรอก Email + Password
  → React ส่ง POST ไป Apps Script (?action=login)
  → Apps Script hash password แล้วเทียบกับ Sheet "users"
  → ถ้าตรง → ส่ง user data + token กลับ
  → React เก็บ user ใน state → แสดง Dashboard
```

### Data Flow
```
User กดบันทึกข้อมูล
  → React ส่ง POST ไป Apps Script (?action=save_plo)
  → Apps Script เขียนทับข้อมูลใน Sheet "plo_data"
  → บันทึก audit_log
  → ส่ง success กลับ → React แสดง Toast "บันทึกสำเร็จ"
```

### Offline Mode
ถ้ายังไม่ได้ใส่ API_URL หรือเชื่อมต่อไม่ได้:
- แสดง **"ออฟไลน์"** สีแดง
- ยังคงใช้งาน Demo ได้ (ข้อมูลอยู่ใน memory)
- Login ด้วยบัญชีทดสอบได้ (offline fallback)

---

## ข้อจำกัดและคำแนะนำ

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Password** | ใช้ SHA-256 hash (เพียงพอสำหรับระบบภายใน ถ้า Production ควรใช้ bcrypt) |
| **Rate Limit** | Google Apps Script จำกัด 90 นาที/วัน สำหรับบัญชีฟรี |
| **Concurrent Users** | รองรับ 30 user พร้อมกัน (Apps Script limitation) |
| **Data Size** | Google Sheets รองรับ 10 ล้าน cells (เพียงพอสำหรับหลักสูตรเดียว) |
| **Backup** | Google Sheets มี Version History อัตโนมัติ |
| **ส่ง OTP จริง** | เปิดคอมเมนต์ `MailApp.sendEmail()` ใน Apps Script |

---

## อัปเดต API (Re-deploy)

เมื่อแก้ไขโค้ดใน Apps Script:
1. กด **Deploy → Manage deployments**
2. กด ✏️ แก้ไข deployment ที่มีอยู่
3. เปลี่ยน **Version** เป็น "New version"
4. กด **Deploy**
5. URL เดิมใช้ได้เลย ไม่ต้องเปลี่ยน
