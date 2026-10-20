import { fmtB, baseName } from './../core/utils.js';
import { loadImage, EXT } from './../helpers/images.js';
import { imageOutput } from '../helpers/image-quality.js';

export default {id:'img-convert',group:'รูปภาพ',nav:'แปลงรูปภาพ',hint:'JPG PNG WebP',kind:'image',multi:true,
 title:'แปลงรูปภาพ JPG / PNG / WebP',desc:'เปลี่ยนรูปแบบไฟล์ภาพได้หลายไฟล์พร้อมกัน เลือกคุณภาพของ JPG และ WebP ได้',
 from:['.jpg','.png','.webp','.gif','.bmp'],to:['.jpg','.png','.webp'],cta:'แปลงรูปภาพ',
 options:[
  {id:'fmt',label:'แปลงเป็น',type:'select',def:'jpeg',choices:[['jpeg','JPG'],['png','PNG'],['webp','WebP']]},
  {id:'q',label:'คุณภาพ',type:'quality',def:'high'}
 ],
 note:'ภาพโปร่งใสที่แปลงเป็น JPG จะได้พื้นหลังสีขาว',
 run:async function(c){
  for(var i=0;i<c.files.length;i++){
   c.chk();var f=c.files[i];c.set(i/c.files.length,'กำลังแปลง '+f.name);
   try{
    var src=await loadImage(f);
    try{var output=await imageOutput(src,f,c.v,false),b=output.blob}
    finally{if(typeof src.close==='function')src.close()}
    c.add({name:baseName(f.name)+'.'+EXT[b.type],blob:b,note:fmtB(f.size)+' → '+fmtB(b.size)});
   }catch(e){c.fail(f.name,e)}
  }
 }};
