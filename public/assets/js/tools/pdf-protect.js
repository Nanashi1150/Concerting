import { fmtB, baseName, need } from './../core/utils.js';
import { pdfPagesJpeg } from './../helpers/pdf.js';
import { DPI } from './../tools/options.js';

export default {id:'pdf-protect',group:'จัดการ PDF',nav:'ใส่รหัสผ่าน PDF',hint:'เข้ารหัส PDF',kind:'pdf',multi:true,
 title:'ใส่รหัสผ่านให้ไฟล์ PDF',desc:'ตั้งรหัสผ่านสำหรับเปิดไฟล์ และเลือกได้ว่าจะอนุญาตให้พิมพ์หรือคัดลอกหรือไม่',
 from:['.pdf'],to:['.pdf'],cta:'ใส่รหัสผ่าน',
 options:[
  {id:'pw1',label:'รหัสผ่านใหม่',type:'password',def:''},
  {id:'pw2',label:'ยืนยันรหัสผ่าน',type:'password',def:''},
  {id:'src',label:'รหัสผ่านเดิมของไฟล์ (ถ้ามี)',type:'password',def:''},
  {id:'scale',label:'ความคมชัด',type:'select',def:'2',choices:DPI},
  {id:'allowPrint',label:'อนุญาตให้พิมพ์',type:'checkbox',def:true},
  {id:'allowCopy',label:'อนุญาตให้คัดลอก',type:'checkbox',def:false}],
 note:'จดรหัสผ่านไว้ เพราะกู้คืนให้ไม่ได้ ไฟล์ที่ได้ใช้การเข้ารหัสมาตรฐานแบบพื้นฐานของ PDF และสร้างจากภาพของแต่ละหน้า จึงเลือกข้อความไม่ได้ หากเป็นเอกสารที่ต้องปกป้องระดับสูง ควรใช้โปรแกรมเข้ารหัสเฉพาะทาง',
 warn:true,
 validate:function(v){if(!v.pw1)return 'ตั้งรหัสผ่านก่อน';if(v.pw1.length<4)return 'รหัสผ่านควรยาวอย่างน้อย 4 ตัวอักษร';if(v.pw1!==v.pw2)return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'},
 run:async function(c){
  var J=need('jspdf').jsPDF;
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pgs=await pdfPagesJpeg(f,c.v.src,+c.v.scale,0.9,function(fr,m){c.set((i+fr)/c.files.length,f.name+' · '+m)},c.chk);
    var perms=[];if(c.v.allowPrint)perms.push('print');if(c.v.allowCopy)perms.push('copy');
    var rnd=new Uint8Array(12);crypto.getRandomValues(rnd);var owner=Array.from(rnd,function(b){return b.toString(16).padStart(2,'0')}).join('');
    var doc=null;
    for(var k=0;k<pgs.length;k++){
     var w=pgs[k].w,h=pgs[k].h,o=w>h?'l':'p';
     if(!doc)doc=new J({unit:'pt',format:[w,h],orientation:o,compress:true,encryption:{userPassword:c.v.pw1,ownerPassword:owner,userPermissions:perms}});
     else doc.addPage([w,h],o);
     doc.addImage(pgs[k].jpg,'JPEG',0,0,w,h);
    }
    var blob=doc.output('blob');
    c.add({name:baseName(f.name)+'-protected.pdf',blob:blob,note:pgs.length+' หน้า · '+fmtB(blob.size)});
   }catch(e){c.fail(f.name,e)}
  }
 }};
