import { fmtB, baseName } from './../core/utils.js';
import { loadImage, EXT, pickType, compressOne } from './../helpers/images.js';

export default {id:'img-compress',group:'รูปภาพ',nav:'บีบอัดรูปภาพ',hint:'กำหนดเอง',kind:'image',multi:true,
 title:'บีบอัดรูปภาพแบบกำหนดเอง',desc:'ลดขนาดไฟล์ภาพตามคุณภาพ ขนาดภาพ หรือขนาดไฟล์สูงสุดที่ต้องการ',
 from:['.jpg','.png','.webp'],to:['.jpg','.png','.webp'],cta:'บีบอัด',
 options:[
  {id:'mode',label:'วิธีกำหนด',type:'select',def:'q',choices:[['q','กำหนดคุณภาพ'],['t','กำหนดขนาดไฟล์สูงสุด']]},
  {id:'q',label:'คุณภาพ',type:'range',min:10,max:100,step:1,def:75,unit:'%',when:function(v){return v.mode==='q'&&v.fmt!=='png'}},
  {id:'kb',label:'ขนาดสูงสุดต่อไฟล์ (KB)',type:'number',def:300,min:5,max:20000,when:function(v){return v.mode==='t'}},
  {id:'fmt',label:'รูปแบบผลลัพธ์',type:'select',def:'auto',choices:[['auto','เหมือนไฟล์เดิม'],['jpeg','JPG'],['webp','WebP'],['png','PNG']]},
  {id:'side',label:'ด้านที่ยาวที่สุดไม่เกิน (px)',type:'number',def:0,min:0,max:20000,hint:'ใส่ 0 หากไม่ต้องการย่อขนาดภาพ'}
 ],
 note:'PNG บีบอัดแบบไม่สูญเสียคุณภาพ จึงลดขนาดได้ด้วยการย่อภาพเท่านั้น หากต้องการให้เล็กลงมาก ให้เลือก JPG หรือ WebP',
 run:async function(c){
  var tot0=0,tot1=0;
  for(var i=0;i<c.files.length;i++){
   c.chk();var f=c.files[i];c.set(i/c.files.length,'กำลังบีบอัด '+f.name);
   try{
    var src=await loadImage(f),type=pickType(f,c.v.fmt);
    var r=await compressOne(src,{type:type,q:c.v.q/100,maxSide:+c.v.side||0,targetKB:c.v.mode==='t'?(+c.v.kb||300):0});
    var ratio=Math.round((1-r.blob.size/f.size)*100),note=fmtB(f.size)+' → '+fmtB(r.blob.size)+(ratio>0?' (ลดลง '+ratio+'%)':' (ใหญ่กว่าเดิม)'),cls=ratio>0?'g':'w';
    if(c.v.mode==='t'&&!r.hit){note+=' · ลดถึงเป้าหมายไม่ได้';cls='w'}
    tot0+=f.size;tot1+=Math.min(f.size,r.blob.size);
    c.add({name:baseName(f.name)+'-small.'+EXT[type],blob:r.blob,note:note,cls:cls});
   }catch(e){c.fail(f.name,e)}
  }
 }};
