import { fmtB, baseName, need, freeCanvas } from './../core/utils.js';
import { openPdf, renderPage, pageText } from './../helpers/pdf.js';
import { PW, DPI } from './../tools/options.js';

export default {id:'pdf-pptx',group:'PDF เป็นไฟล์อื่น',nav:'PDF เป็น PowerPoint',hint:'PDF → PPTX',kind:'pdf',multi:true,
 title:'แปลง PDF เป็น PowerPoint (.pptx)',desc:'หนึ่งหน้า PDF ต่อหนึ่งสไลด์ เลือกได้ว่าจะให้เหมือนต้นฉบับทุกจุด หรือให้แก้ไขข้อความได้',
 from:['.pdf'],to:['.pptx'],cta:'แปลงเป็น PowerPoint',
 options:[
  {id:'mode',label:'รูปแบบสไลด์',type:'select',def:'img',choices:[['img','ภาพเหมือนต้นฉบับ (แก้ข้อความไม่ได้)'],['txt','ข้อความแก้ไขได้ (จัดวางโดยประมาณ)']]},
  {id:'scale',label:'ความคมชัดของภาพ',type:'select',def:'2',choices:DPI,when:function(v){return v.mode==='img'}},
  PW],
 run:async function(c){
  var Pp=window.PptxGenJS||need('pptxgen');
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pdf=await openPdf(f,c.v.pw),first=await pdf.getPage(1),v1=first.getViewport({scale:1});
    var W=13.333,H=W*v1.height/v1.width,pptx=new Pp();pptx.defineLayout({name:'PDFPAGE',width:W,height:H});pptx.layout='PDFPAGE';
    for(var p=1;p<=pdf.numPages;p++){
     c.chk();c.set((i+p/pdf.numPages)/c.files.length,f.name+' หน้า '+p+' จาก '+pdf.numPages);
     var pg=await pdf.getPage(p),vp=pg.getViewport({scale:1}),k=Math.min(W/vp.width,H/vp.height),ox=(W-vp.width*k)/2,oy=(H-vp.height*k)/2,sl=pptx.addSlide(),done=false;
     if(c.v.mode==='txt'){
      var pt=await pageText(pg);
      if(pt.chars>=15){
       done=true;
       pt.lines.forEach(function(l){
        if(!l.text)return;
        sl.addText(l.text,{x:ox+l.x*k,y:oy+(vp.height-l.y-l.h*0.85)*k,w:(l.right-l.x)*k+0.5,h:l.h*1.3*k,fontSize:Math.max(6,Math.round(l.h*k*72)),fontFace:'Tahoma',margin:0,valign:'top',wrap:false,color:'111111'});
       });
      }
     }
     if(!done){
      var cv=await renderPage(pg,+c.v.scale||2),url=cv.toDataURL('image/jpeg',0.9);freeCanvas(cv);
      sl.addImage({data:url.slice(5),x:ox,y:oy,w:vp.width*k,h:vp.height*k});
     }
    }
    c.set(0.95,'บันทึกไฟล์ '+f.name);
    var blob=await pptx.write({outputType:'blob'});
    c.add({name:baseName(f.name)+'.pptx',blob:blob,note:pdf.numPages+' สไลด์ · '+fmtB(blob.size)});
   }catch(e){c.fail(f.name,e)}
  }
 }};
