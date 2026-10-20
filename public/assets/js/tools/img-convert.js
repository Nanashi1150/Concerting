import { fmtB, baseName, freeCanvas } from './../core/utils.js';
import { loadImage, drawImg, EXT, encode, pickType } from './../helpers/images.js';

export default {id:'img-convert',group:'รูปภาพ',nav:'แปลงรูปภาพ',hint:'JPG PNG WebP',kind:'image',multi:true,
 title:'แปลงรูปภาพ JPG / PNG / WebP',desc:'เปลี่ยนรูปแบบไฟล์ภาพได้หลายไฟล์พร้อมกัน เลือกคุณภาพของ JPG และ WebP ได้',
 from:['.jpg','.png','.webp','.gif','.bmp'],to:['.jpg','.png','.webp'],cta:'แปลงรูปภาพ',
 options:[
  {id:'fmt',label:'แปลงเป็น',type:'select',def:'jpeg',choices:[['jpeg','JPG'],['png','PNG'],['webp','WebP']]},
  {id:'q',label:'คุณภาพ',type:'range',min:30,max:100,step:1,def:92,unit:'%',when:function(v){return v.fmt!=='png'}}
 ],
 note:'ภาพโปร่งใสที่แปลงเป็น JPG จะได้พื้นหลังสีขาว',
 run:async function(c){
  for(var i=0;i<c.files.length;i++){
   c.chk();var f=c.files[i];c.set(i/c.files.length,'กำลังแปลง '+f.name);
   try{
    var src=await loadImage(f),type=pickType(f,c.v.fmt),cv=drawImg(src,1,type==='image/jpeg'),b=await encode(cv,type,c.v.q/100);freeCanvas(cv);
    c.add({name:baseName(f.name)+'.'+EXT[type],blob:b,note:fmtB(f.size)+' → '+fmtB(b.size)});
   }catch(e){c.fail(f.name,e)}
  }
 }};
