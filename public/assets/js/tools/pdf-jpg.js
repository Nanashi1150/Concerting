import { fmtB, baseName, toBlob, freeCanvas } from './../core/utils.js';
import { EXT } from './../helpers/images.js';
import { openPdf, renderPage, parseRange } from './../helpers/pdf.js';
import { PW, DPI } from './../tools/options.js';

export default {id:'pdf-jpg',group:'PDF เป็นไฟล์อื่น',nav:'PDF เป็น JPG',hint:'PDF → JPG PNG',kind:'pdf',multi:true,
 title:'แปลง PDF เป็นรูปภาพ JPG',desc:'แยกแต่ละหน้าของ PDF เป็นไฟล์ภาพ เลือกความคมชัดและช่วงหน้าได้',
 from:['.pdf'],to:['.jpg','.png'],cta:'แปลงเป็นรูปภาพ',
 options:[
  {id:'fmt',label:'รูปแบบภาพ',type:'select',def:'jpeg',choices:[['jpeg','JPG'],['png','PNG']]},
  {id:'scale',label:'ความคมชัด',type:'select',def:'2',choices:DPI},
  {id:'range',label:'หน้าที่ต้องการ',type:'text',def:'',hint:'เว้นว่างเพื่อเอาทุกหน้า หรือพิมพ์ เช่น 1-3,5'},
  PW],
 run:async function(c){
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pdf=await openPdf(f,c.v.pw),pages=parseRange(c.v.range,pdf.numPages),type=c.v.fmt==='png'?'image/png':'image/jpeg';
    for(var k=0;k<pages.length;k++){
     c.chk();c.set((i+k/pages.length)/c.files.length,f.name+' หน้า '+pages[k]);
     var pg=await pdf.getPage(pages[k]),cv=await renderPage(pg,+c.v.scale),b=await toBlob(cv,type,0.92);freeCanvas(cv);
     c.add({name:baseName(f.name)+'-หน้า'+pages[k]+'.'+EXT[type],blob:b,note:fmtB(b.size)});
    }
   }catch(e){c.fail(f.name,e)}
  }
 }};
