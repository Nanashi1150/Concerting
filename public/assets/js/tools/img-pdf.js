import { baseName, need, toBlob, freeCanvas } from './../core/utils.js';
import { loadImage, dims, drawImg } from './../helpers/images.js';

export default {id:'img-pdf',group:'รูปภาพ',nav:'รูปภาพเป็น PDF',hint:'JPG PNG → PDF',kind:'image',multi:true,ordered:true,
 title:'รวมรูปภาพเป็นไฟล์ PDF',desc:'นำภาพหลายภาพมาเรียงเป็น PDF ไฟล์เดียว จัดลำดับด้วยปุ่มลูกศรได้',
 from:['.jpg','.png','.webp'],to:['.pdf'],cta:'สร้าง PDF',
 options:[
  {id:'size',label:'ขนาดหน้า',type:'select',def:'fit',choices:[['fit','เท่ากับขนาดภาพ'],['a4p','A4 แนวตั้ง'],['a4l','A4 แนวนอน']]},
  {id:'margin',label:'ขอบกระดาษ',type:'select',def:'0',choices:[['0','ไม่มีขอบ'],['28','แคบ (10 มม.)'],['57','กว้าง (20 มม.)']],when:function(v){return v.size!=='fit'}}
 ],
 run:async function(c){
  var P=need('PDFLib'),doc=await P.PDFDocument.create();
  for(var i=0;i<c.files.length;i++){
   c.chk();var f=c.files[i];c.set(i/c.files.length,'กำลังใส่ภาพ '+f.name);
   var src=await loadImage(f),d=dims(src),png=(f.type==='image/png'||f.type==='image/webp'||f.type==='image/gif');
   var cv=drawImg(src,1,!png),blob=await toBlob(cv,png?'image/png':'image/jpeg',0.92);freeCanvas(cv);
   var emb=png?await doc.embedPng(await blob.arrayBuffer()):await doc.embedJpg(await blob.arrayBuffer());
   var pw,ph,x=0,y=0,w,h;
   if(c.v.size==='fit'){pw=d[0]*0.75;ph=d[1]*0.75;w=pw;h=ph}
   else{
    var land=c.v.size==='a4l';pw=land?841.89:595.28;ph=land?595.28:841.89;var m=+c.v.margin,aw=pw-2*m,ah=ph-2*m,s=Math.min(aw/d[0],ah/d[1]);
    w=d[0]*s;h=d[1]*s;x=(pw-w)/2;y=(ph-h)/2;
   }
   var pg=doc.addPage([pw,ph]);pg.drawImage(emb,{x:x,y:y,width:w,height:h});
  }
  c.set(0.97,'บันทึกไฟล์');
  c.add({name:(c.files.length===1?baseName(c.files[0].name):'รวมรูปภาพ')+'.pdf',blob:new Blob([await doc.save()],{type:'application/pdf'}),note:c.files.length+' หน้า'});
 }};
