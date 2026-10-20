import { fmtB, baseName, need } from './../core/utils.js';
import { pdfPagesJpeg } from './../helpers/pdf.js';
import { DPI } from './../tools/options.js';

export default {id:'pdf-unlock',group:'จัดการ PDF',nav:'ปลดล็อก PDF',hint:'ลบรหัสผ่าน',kind:'pdf',multi:true,
 title:'ปลดล็อกไฟล์ PDF',desc:'ลบรหัสผ่านและข้อจำกัดการพิมพ์หรือคัดลอกออกจากไฟล์ PDF ของคุณ โดยต้องรู้รหัสผ่านสำหรับเปิดไฟล์',
 from:['.pdf'],to:['.pdf'],cta:'ปลดล็อก',
 options:[
  {id:'pw',label:'รหัสผ่านเปิดไฟล์',type:'password',def:'',hint:'ปล่อยว่างหากไฟล์เปิดได้ปกติแต่ถูกจำกัดสิทธิ์'},
  {id:'scale',label:'ความคมชัด',type:'select',def:'2',choices:DPI}],
 note:'ใช้กับไฟล์ที่คุณมีสิทธิ์เท่านั้น เครื่องมือนี้ไม่เดารหัสผ่าน ไฟล์ที่ได้สร้างจากภาพของแต่ละหน้า จึงพิมพ์และคัดลอกภาพได้ แต่เลือกข้อความไม่ได้',
 warn:true,
 run:async function(c){
  var P=need('PDFLib');
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pgs=await pdfPagesJpeg(f,c.v.pw,+c.v.scale,0.92,function(fr,m){c.set((i+fr)/c.files.length,f.name+' · '+m)},c.chk),doc=await P.PDFDocument.create();
    for(var k=0;k<pgs.length;k++){var img=await doc.embedJpg(pgs[k].jpg),pg=doc.addPage([pgs[k].w,pgs[k].h]);pg.drawImage(img,{x:0,y:0,width:pgs[k].w,height:pgs[k].h})}
    var blob=new Blob([await doc.save()],{type:'application/pdf'});
    c.add({name:baseName(f.name)+'-unlocked.pdf',blob:blob,note:pgs.length+' หน้า · '+fmtB(blob.size)});
   }catch(e){c.fail(f.name,e)}
  }
 }};
