# WFME Competency Analysis Dashboard

Dashboard สำหรับวิเคราะห์สมรรถนะนักศึกษาแพทย์ตามเกณฑ์ WFME สร้างด้วย React และ Vite (Recharts)

## การติดตั้งและรันโปรเจค (Local)

1. **ติดตั้ง Dependencies**:
   ```bash
   npm install
   ```
2. **รันโปรเจค**:
   ```bash
   npm run dev
   ```

## การนำขึ้น Deploy (Production)

### วิธีที่ 1: Vercel (แนะนำ)
1. นำโค้ดทั้งหมดขึ้น GitHub Repository
2. ไปที่ [Vercel](https://vercel.com) -> New Project
3. เลือก GitHub Repo ที่เพิ่งสร้าง
4. กด **Deploy** (Vercel จะตรวจพบว่าเป็น Vite App และตั้งค่าให้อัตโนมัติ)

### วิธีที่ 2: Netlify
1. นำโค้ดขึ้น GitHub
2. ไปที่ [Netlify](https://netlify.com) -> Add new site -> Import from Git
3. เลือก GitHub Repo
4. **Build command**: `npm run build`
5. **Publish directory**: `dist`
6. กด **Deploy**

## โครงสร้างไฟล์
- `src/App.jsx`: โค้ดหลักของ Dashboard (Logic และ UI)
- `src/main.jsx`: Entry point
