import { fmtB, baseName, toBlob, freeCanvas } from '../core/utils.js';
import { openPdf, renderPage, parseRange } from './pdf.js';
import { PW, DPI } from '../tools/options.js';

export function createPdfImageTool(format,type){
  var extension=format.toLowerCase();
  return {
    id:'pdf-'+extension,group:'PDF เป็นไฟล์อื่น',nav:'PDF เป็น '+format,hint:'PDF → '+format,kind:'pdf',multi:true,
    title:'แปลง PDF เป็นรูปภาพ '+format,desc:'แยกแต่ละหน้าของ PDF เป็นไฟล์ภาพ '+format+' เลือกความคมชัดและช่วงหน้าได้',
    from:['.pdf'],to:['.'+extension],cta:'แปลงเป็น '+format,
    options:[
      {id:'scale',label:'ความคมชัด',type:'select',def:'2',choices:DPI},
      {id:'range',label:'หน้าที่ต้องการ',type:'text',def:'',hint:'เว้นว่างเพื่อเอาทุกหน้า หรือพิมพ์ เช่น 1-3,5'},
      PW
    ],
    run:async function(c){
      for(var i=0;i<c.files.length;i++){
        var f=c.files[i],pdf=null;
        try{
          pdf=await openPdf(f,c.v.pw);
          var pages=parseRange(c.v.range,pdf.numPages);
          for(var k=0;k<pages.length;k++){
            c.chk();c.set((i+k/pages.length)/c.files.length,f.name+' หน้า '+pages[k]);
            var page=await pdf.getPage(pages[k]),canvas=await renderPage(page,+c.v.scale),blob;
            try{blob=await toBlob(canvas,type,0.92)}
            finally{freeCanvas(canvas)}
            if(blob.type!==type)throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างภาพ '+format);
            c.add({name:baseName(f.name)+'-หน้า'+pages[k]+'.'+extension,blob:blob,note:fmtB(blob.size)});
          }
        }catch(error){c.fail(f.name,error)}
        finally{if(pdf)await pdf.destroy()}
      }
    }
  };
}
