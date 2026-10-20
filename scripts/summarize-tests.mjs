import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../test-results/',import.meta.url));
const latest=new Map();
for(const entry of await readdir(root,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  try{
    const report=JSON.parse(await readFile(join(root,entry.name,'report.json'),'utf8'));
    const key=entry.name.replace(/^\d+-/,'');
    if(!latest.has(key)||entry.name>latest.get(key).runName)latest.set(key,report);
  }catch(error){if(error.code!=='ENOENT')throw error}
}
let filesChecked=0;
for(const report of latest.values())for(const file of report.artifacts){
  const bytes=await readFile(join(root,report.runName,file.path));
  if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Artifact integrity failed: '+file.path);
  filesChecked++;
}
const http=JSON.parse(await readFile(join(root,'http-report.json'),'utf8'));
const summary={passed:http.passed&&Array.from(latest.values()).every(r=>r.passed),checks:http.checks+Array.from(latest.values()).reduce((n,r)=>n+r.checks,0),filesVerified:filesChecked,runs:Array.from(latest.values()).map(r=>({directory:r.runName,passed:r.passed,checks:r.checks,artifacts:r.artifacts.length})),httpChecks:http.checks};
await writeFile(join(root,'summary.json'),JSON.stringify(summary,null,2)+'\n');
await writeFile(join(root,'README.md'),[
  '# ผลทดสอบระบบ',
  '',
  'สถานะล่าสุด: '+(summary.passed?'ผ่าน':'มีรายการไม่ผ่าน'),
  '',
  '- จุดตรวจรวม: '+summary.checks,
  '- ไฟล์ผลลัพธ์ที่ตรวจจำนวนไบต์และ SHA-256: '+filesChecked,
  '- HTTP และ build output: '+http.checks+' จุดตรวจ — [รายงาน](http-report.json)',
  '',
  '| รอบทดสอบล่าสุด | จุดตรวจ | ไฟล์ | ภาพ | รายงาน |',
  '| --- | ---: | ---: | --- | --- |',
  ...summary.runs.map(r=>'| '+r.directory+' | '+r.checks+' | '+r.artifacts+' | [ดูภาพ]('+r.directory+'/gallery.html) | [รายละเอียด]('+r.directory+'/README.md) |'),
  '',
  '## ปัญหาที่พบและแก้ไข',
  '',
  '- URL ไลบรารี PowerPoint เดิมตอบ 404: เปลี่ยนเป็น jsDelivr ที่ระบุรุ่นเดิม 3.12.0',
  '- ZIP อาจเขียนทับไฟล์เมื่อชื่อซ้ำกับชื่อที่เติมเลข: ตรวจชื่อปลายทางทุกชื่อก่อนบันทึก',
  '- การระบุเป้าขนาดไฟล์นอกช่วงในช่องตัวเลขไม่ได้ถูกปฏิเสธ: เพิ่ม validation สำหรับ 5–20,000 KiB',
  '',
  '## ขอบเขตและข้อจำกัด',
  '',
  '- ภาพทดสอบสร้างขึ้นสำหรับการตรวจ รวมภาพขนาด MiB และภาพโปร่งใส ไม่ได้ใช้เอกสารส่วนตัว',
  '- ทดสอบ native image/PDF encoding, Office ZIP/XML, UI DOM/layout และ blob ที่ส่งให้ลิงก์ดาวน์โหลดจริง',
  '- การคลิก UI เป็น event automation และการดาวน์โหลดถูกดักเก็บ blob ไม่ได้ทดสอบกล่อง Save ของระบบปฏิบัติการ',
  '- การแปลใช้ตัวแปลจำลองภายใน ไม่ได้เรียก Claude จริง',
  '- ยังไม่ได้เปิดผลลัพธ์ตรวจหน้าตาใน Microsoft Office หรือทดสอบ deployment บน Vercel',
  '- เก็บรอบที่ไม่ผ่านก่อนแก้ไว้ด้วย ตารางนี้อ้างอิงรอบล่าสุดของแต่ละชุดและเบราว์เซอร์',
  '',
  'รันทดสอบใหม่ด้วย npm.cmd run test:images, npm.cmd run test:system และ npm.cmd run test:http หลัง npm.cmd run build แล้วสรุปด้วย npm.cmd run test:summary'
].join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
if(!summary.passed)process.exitCode=1;
