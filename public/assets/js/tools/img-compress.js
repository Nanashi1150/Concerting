import { fmtB, baseName } from './../core/utils.js';
import { loadImage, EXT } from './../helpers/images.js';
import { imageOutput } from '../helpers/image-quality.js';

export default {id:'img-compress',group:'รูปภาพ',nav:'บีบอัดรูปภาพ',hint:'กำหนดเอง',kind:'image',multi:true,
 title:'บีบอัดรูปภาพ',desc:'เลือกคุณภาพสูง กลาง หรือต่ำ พร้อมเปรียบเทียบขนาดไฟล์ก่อนบีบอัด หรือกำหนดขนาดไฟล์สูงสุดเอง',
 from:['.jpg','.png','.webp'],to:['.jpg','.png','.webp'],cta:'บีบอัด',
 options:[
  {id:'mode',label:'วิธีกำหนด',type:'select',def:'q',choices:[['q','เลือกระดับคุณภาพ'],['t','กำหนดขนาดไฟล์สูงสุด']]},
  {id:'kb',label:'ขนาดสูงสุดต่อไฟล์ (KiB)',type:'number',def:300,min:5,max:20000,hint:'1 KiB = 1,024 ไบต์',when:function(v){return v.mode==='t'}},
  {id:'fmt',label:'รูปแบบผลลัพธ์',type:'select',def:'auto',choices:[['auto','เหมือนไฟล์เดิม'],['jpeg','JPG'],['webp','WebP'],['png','PNG']]},
  {id:'q',label:'คุณภาพหลังบีบอัด',type:'quality',def:'medium',when:function(v){return v.mode==='q'}}
 ],
 note:'ขนาดผลลัพธ์ขึ้นอยู่กับภาพต้นฉบับ ไฟล์ที่บีบอัดมาแล้วอาจไม่เล็กลง PNG ไม่ใช้ค่าคุณภาพแบบ JPG ระดับกลางและต่ำจึงลดความละเอียดภาพ หากต้องการคงความละเอียดและลดขนาด ให้ลอง JPG หรือ WebP',
 validate:function(v){if(v.mode==='t'&&(!Number.isFinite(Number(v.kb))||Number(v.kb)<5||Number(v.kb)>20000))return 'ระบุขนาดไฟล์ตั้งแต่ 5 ถึง 20,000 KiB'},
 run:async function(c){
  var tot0=0,tot1=0;
  for(var i=0;i<c.files.length;i++){
   c.chk();var f=c.files[i];c.set(i/c.files.length,'กำลังบีบอัด '+f.name);
   try{
    var src=await loadImage(f);
    try{var r=await imageOutput(src,f,c.v,true)}
    finally{if(typeof src.close==='function')src.close()}
    var smaller=r.blob.size<f.size,ratio=Math.round((1-r.blob.size/f.size)*100);
    var change=smaller?(ratio>0?'ลดลง '+ratio+'%':'ลดลงน้อยกว่า 1%'):r.blob.size===f.size?'ขนาดเท่าเดิม':'ใหญ่กว่าเดิม';
    var note=fmtB(f.size)+' → '+fmtB(r.blob.size)+' ('+change+')',cls=smaller?'g':'w';
    if(c.v.mode==='t'&&!r.hit){note+=' · ลดถึงเป้าหมายไม่ได้';cls='w'}
    tot0+=f.size;tot1+=Math.min(f.size,r.blob.size);
    c.add({name:baseName(f.name)+'-small.'+EXT[r.blob.type],blob:r.blob,note:note,cls:cls});
   }catch(e){c.fail(f.name,e)}
  }
 }};
