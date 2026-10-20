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

- โหลดไลบรารีจาก cdnjs / jsDelivr และฟอนต์จาก Google Fonts จึงต้องใช้อินเทอร์เน็ต แม้การแปลงไฟล์ทั่วไปจะประมวลผลในเครื่อง
- การแปล PDF เดิมใช้ `window.claude.use('sample')` ซึ่งไม่มีบนเว็บ Vercel จึงปิดปุ่มแปลพร้อมข้อความแจ้งเมื่อเปิดนอก Claude หากต้องการแปลบนเว็บจริง ต้องเพิ่มบริการแปลฝั่ง server และกำหนด API key แยกต่างหาก
- การแปลผ่าน Claude เมื่อใช้งานได้จะส่งข้อความในเอกสารให้ Claude ส่วนเครื่องมือแปลงไฟล์ทั่วไปไม่อัปโหลดเอกสาร
- การแปลง PDF เป็น Office ยังมีข้อจำกัดเรื่องรูปแบบ ตาราง และเอกสารสแกนตามเครื่องมือเดิม

## เกณฑ์ระดับคุณภาพและการตรวจขนาดไฟล์

ระดับสูง กลาง และต่ำเป็น preset ของโปรเจกต์ ไม่ใช่คะแนนคุณภาพภาพจากการวัด:

| ระดับ | ค่าคุณภาพตัวเข้ารหัส JPG / WebP | ความกว้างและสูงของ PNG ในหน้าบีบอัด |
| --- | --- | --- |
| สูง | 0.92 | 100% ของต้นฉบับ |
| กลาง | 0.75 | ประมาณ 80% ของต้นฉบับ |
| ต่ำ | 0.45 | ประมาณ 60% ของต้นฉบับ |

การแปลงรูปภาพเป็น PNG คงความละเอียดเดิมทุกระดับ เพราะ PNG ไม่ใช้ค่าคุณภาพแบบ JPG / WebP ส่วนการบีบอัด PNG ลดความละเอียดตามตารางโดยปัดขนาดเป็นจำนวนพิกเซลเต็ม

ขนาดที่แสดงอ่านจาก `Blob.size` ของภาพที่เข้ารหัสจริง ไม่ได้คำนวณจากเปอร์เซ็นต์ preset พรีวิวกับการแปลงจริงใช้ `imageOutput()` ร่วมกัน ขนาดรวมหลายไฟล์เป็นผลบวกของจำนวนไบต์ก่อนปัดเศษแสดงผล ชี้ที่ขนาดเพื่อดูจำนวนไบต์เต็มได้ หน่วยแสดงผลใช้ 1 KiB = 1,024 ไบต์ และ 1 MiB = 1,048,576 ไบต์

ขนาดขึ้นอยู่กับรายละเอียดภาพ รูปแบบไฟล์ และตัวเข้ารหัสของเบราว์เซอร์ จึงไม่รับประกันเปอร์เซ็นต์การลดขนาดหรือผลเหมือนกันข้ามเบราว์เซอร์ การตั้งขนาดสูงสุดตรวจผลจริง หากลดไม่ถึงเป้าจะมีข้อความแจ้ง

รันการตรวจด้วย Chrome หรือ Edge แบบ headless โดยใช้ profile ชั่วคราวแยกจากบัญชีผู้ใช้:

```sh
npm run test:images
```

บน PowerShell ที่บล็อก npm.ps1 ใช้ `npm.cmd run test:images` สคริปต์จะค้นหา Chrome หรือ Edge ในตำแหน่งติดตั้งมาตรฐานบน Windows หรือกำหนด `BROWSER_PATH` เป็น path ของ Chromium browser ที่ติดตั้งไว้

ชุดตรวจสร้างภาพรายละเอียดสูง ภาพ JPG, WebP, ภาพโปร่งใส และภาพ 1920×1080 ที่มีขนาดเกิน 1 MiB แล้วตรวจจำนวนไบต์ พรีวิวกับผลลัพธ์จริง ขนาดพิกเซล MIME type พื้นขาวของ JPG ขนาดรวม การเปลี่ยนตัวเลือก หน่วยไฟล์ และการแจ้งผลเมื่อขนาดเกินเป้า การทดสอบขอบเขตเปรียบเทียบขนาดต่างกัน 1 ไบต์ใช้ขนาดไฟล์จำลองร่วมกับการเข้ารหัสภาพจริง

## ทดสอบระบบและเก็บไฟล์ผลลัพธ์

```sh
npm run build
npm run test:http
npm run test:images
npm run test:system
npm run test:summary
```

ใช้ `npm.cmd` แทน `npm` หาก PowerShell บล็อก npm.ps1

ผลลัพธ์เก็บใน `test-results/` แยกตามเวลาเขต Asia/Bangkok ชุดทดสอบ และเบราว์เซอร์:

```text
test-results/
  README.md                    สรุปผลล่าสุดทุกชุด
  summary.json                 จำนวนจุดตรวจและไฟล์ที่ตรวจ hash แล้ว
  <เวลา>-quality-chrome/
    fixtures/                  ภาพต้นฉบับสำหรับเปรียบเทียบ
    images/                    ภาพผลลัพธ์ทุกระดับและรูปแบบ
    gallery.html               เปิดดูภาพพร้อมชื่อและขนาดไฟล์
    report.json                ผลตรวจ จำนวนไบต์ และ SHA-256
  <เวลา>-system-chrome/
    fixtures/                  ภาพและ PDF สำหรับทดสอบ
    images/                    รูปภาพจาก PDF และการแปลงผ่าน UI
    files/                     PDF, DOCX, PPTX, XLSX, ZIP และผลแปลจำลอง
    gallery.html
    report.json
```

`test:system` ตรวจครบ 11 เครื่องมือ รวมการใช้ผ่านหน้าเว็บ การกรองและเรียงไฟล์ การจำตัวเลือก การยกเลิก ZIP ชื่อซ้ำ ไฟล์เสีย รหัสผ่าน PDF ตัวเลือกและ layout มือถือ/เดสก์ท็อป ส่วนการแปลตรวจด้วยตัวแปลจำลอง ไม่ได้ใช้บัญชี Claude จริง และตรวจไฟล์ Office ผ่าน ZIP/XML ไม่ได้เปิดตรวจหน้าตาใน Microsoft Office

`test:http` ตรวจเซิร์ฟเวอร์จริง HTTP methods, MIME types, ไฟล์ที่ไม่มีอยู่, path traversal และความตรงกันของ public/ กับ dist/ ส่วน `test:summary` ตรวจ hash ของไฟล์ที่บันทึกจากรอบล่าสุด

หากต้องการทดสอบด้วย Edge ให้กำหนดตัวแปร BROWSER_PATH เป็น path ของ msedge.exe แล้วรันชุดทดสอบเดิม ผลลัพธ์จากแต่ละเบราว์เซอร์แยกกัน ไฟล์ทดสอบถูก ignore ใน Git และไม่รวมใน dist/ ที่ deploy

อ้างอิง: [HTML Canvas serialization](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file), [File API: Blob size](https://w3c.github.io/FileAPI/#dfn-size)
