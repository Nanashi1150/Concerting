# ห้องแปลงไฟล์

เว็บแปลงรูปภาพและ PDF ที่ประมวลผลในเบราว์เซอร์ ใช้ HTML, CSS และ JavaScript modules โดยไม่ต้องติดตั้ง framework หรือ dependencies

## โครงสร้าง

```text
public/
  index.html                  หน้าเว็บ
  assets/css/
    base.css                  รูปแบบพื้นฐาน
    app.css                   หน้าตา ธีม และ responsive layout
  assets/js/
    app.js                    UI, state, เลือกไฟล์ และแสดงผล
    core/
      utils.js                ฟังก์ชันพื้นฐานและ canvas
      runtime.js              ดาวน์โหลดและการเชื่อมต่อ Claude เดิม
    helpers/
      images.js               อ่าน แปลง และบีบอัดภาพ
      pdf.js                  อ่าน PDF, render หน้า และดึงข้อความ
      docx.js                 สร้างไฟล์ Word
      translation-pdf.js      จัดหน้า PDF จากข้อความที่แปล
    tools/
      index.js                รวมรายการเครื่องมือ
      options.js              ตัวเลือกที่ใช้ร่วมกัน
      img-*.js                เครื่องมือภาพ แยกหนึ่งไฟล์ต่อเครื่องมือ
      pdf-*.js                เครื่องมือ PDF แยกหนึ่งไฟล์ต่อเครื่องมือ
scripts/
  build.mjs                   ตรวจ syntax/import และสร้าง dist/
  serve.mjs                   เซิร์ฟเวอร์สำหรับพัฒนาและ preview
archive/                      HTML ต้นฉบับสำหรับอ้างอิง
vercel.json                   ตั้งค่า Vercel
```

## รันในเครื่อง

ใช้ Node.js 22 ขึ้นไป ไม่ต้องรัน npm install เพราะไม่มี dependencies

```sh
npm run dev
```

เปิด http://localhost:3000 ต้องเปิดผ่าน HTTP เพราะใช้ JavaScript modules

หาก PowerShell บล็อก npm.ps1 ให้ใช้ `npm.cmd run dev`, `npm.cmd run build` และ `npm.cmd run preview` แทน

```sh
npm run build
npm run preview
```

คำสั่ง preview เสิร์ฟไฟล์จาก dist/ ใช้พอร์ต 3000 เช่นเดียวกับ dev จึงต้องหยุด dev ก่อน

## Deploy บน Vercel

1. นำโฟลเดอร์โปรเจกต์ทั้งหมดขึ้น Git repository แล้ว Import Project ใน Vercel
2. ใช้ Root Directory เป็นโฟลเดอร์ที่มี package.json และ vercel.json
3. ใช้ Framework Preset: Other, Build Command: npm run build, Output Directory: dist ตาม vercel.json
4. กด Deploy

หากติดตั้งและเข้าสู่ระบบ Vercel CLI แล้ว สามารถใช้ `vercel` จากโฟลเดอร์โปรเจกต์เพื่อสร้าง Preview deployment ได้

การเตรียมโปรเจกต์นี้ยังไม่ได้เผยแพร่ขึ้น Vercel หรือผูกกับบัญชีใด

อ้างอิง: [Vercel Project Configuration](https://vercel.com/docs/project-configuration/vercel-json)

## ข้อจำกัด

- โหลดไลบรารีจาก cdnjs และฟอนต์จาก Google Fonts จึงต้องใช้อินเทอร์เน็ต แม้การแปลงไฟล์ทั่วไปจะประมวลผลในเครื่อง
- การแปล PDF เดิมใช้ `window.claude.use('sample')` ซึ่งไม่มีบนเว็บ Vercel จึงปิดปุ่มแปลพร้อมข้อความแจ้งเมื่อเปิดนอก Claude หากต้องการแปลบนเว็บจริง ต้องเพิ่มบริการแปลฝั่ง server และกำหนด API key แยกต่างหาก
- การแปลผ่าน Claude เมื่อใช้งานได้จะส่งข้อความในเอกสารให้ Claude ส่วนเครื่องมือแปลงไฟล์ทั่วไปไม่อัปโหลดเอกสาร
- การแปลง PDF เป็น Office ยังมีข้อจำกัดเรื่องรูปแบบ ตาราง และเอกสารสแกนตามเครื่องมือเดิม
