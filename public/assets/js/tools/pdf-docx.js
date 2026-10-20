import { fmtB, baseName, toBlob, freeCanvas } from './../core/utils.js';
import { openPdf, renderPage, pageText, toParas } from './../helpers/pdf.js';
import { dPara, D_BREAK, dImage, buildDocx } from './../helpers/docx.js';
import { PW } from './../tools/options.js';

export default {id:'pdf-docx',group:'PDF เป็นไฟล์อื่น',nav:'PDF เป็น Word',hint:'PDF → DOCX',kind:'pdf',multi:true,
 title:'แปลง PDF เป็น Word (.docx)',desc:'ดึงข้อความจาก PDF มาจัดเป็นย่อหน้าในไฟล์ Word หน้าที่เป็นภาพสแกนจะถูกใส่เป็นรูปภาพ',
 from:['.pdf'],to:['.docx'],cta:'แปลงเป็น Word',
 options:[PW],
 note:'เหมาะกับเอกสารที่เป็นข้อความ ตารางและการจัดหน้าซับซ้อนอาจไม่เหมือนต้นฉบับ',
 run:async function(c){
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pdf=await openPdf(f,c.v.pw),body='',media=[],scanned=0;
    for(var p=1;p<=pdf.numPages;p++){
     c.chk();c.set((i+p/pdf.numPages)/c.files.length,f.name+' หน้า '+p+' จาก '+pdf.numPages);
     var pg=await pdf.getPage(p),pt=await pageText(pg);
     if(pt.chars<15){
      scanned++;var cv=await renderPage(pg,1.6),jb=await toBlob(cv,'image/jpeg',0.85),ar=cv.height/cv.width;freeCanvas(cv);
      media.push(new Uint8Array(await jb.arrayBuffer()));
      var cx=6000000;body+=dImage('rIdM'+media.length,media.length,cx,Math.round(cx*Math.min(ar,1.4)));
     }else{
      toParas(pt).forEach(function(q){body+=dPara(q.text,Math.max(16,Math.min(72,Math.round(q.size*2))))});
     }
     if(p<pdf.numPages)body+=D_BREAK;
    }
    var blob=await buildDocx(body,media);
    c.add({name:baseName(f.name)+'.docx',blob:blob,note:pdf.numPages+' หน้า · '+fmtB(blob.size)+(scanned?' · '+scanned+' หน้าเป็นภาพสแกน ใส่เป็นรูปภาพ':''),cls:scanned?'w':''});
   }catch(e){c.fail(f.name,e)}
  }
 }};
