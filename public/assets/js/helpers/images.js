import { toBlob, mkCanvas, freeCanvas } from './../core/utils.js';

/* ---------- images ---------- */
async function loadImage(file){
  try{return await createImageBitmap(file)}
  catch(_){
    var url=URL.createObjectURL(file);
    try{var img=new Image();img.src=url;await img.decode();return img}
    catch(e){throw new Error('เปิดไฟล์ภาพ "'+file.name+'" ไม่ได้ (รูปแบบที่เบราว์เซอร์ไม่รองรับ)')}
    finally{setTimeout(function(){URL.revokeObjectURL(url)},2000)}
  }
}
function dims(s){return [s.naturalWidth||s.width,s.naturalHeight||s.height]}
function drawImg(src,scale,white){
  var d=dims(src),c=mkCanvas(d[0]*scale,d[1]*scale),x=c.getContext('2d');
  if(white){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}
  x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;
}
var EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
async function encode(c,type,q){
  var b=await toBlob(c,type,q);
  if(b.type!==type)throw new Error('เบราว์เซอร์นี้บันทึกเป็น '+EXT[type].toUpperCase()+' ไม่ได้ ลองเลือกรูปแบบอื่น');
  return b;
}
function pickType(file,fmt){
  if(fmt==='jpeg')return 'image/jpeg';if(fmt==='png')return 'image/png';if(fmt==='webp')return 'image/webp';
  return EXT[file.type]?file.type:'image/jpeg';
}
async function compressOne(src,o){
  var d=dims(src),s=(o.maxSide&&Math.max(d[0],d[1])>o.maxSide)?o.maxSide/Math.max(d[0],d[1]):1;
  var white=o.type==='image/jpeg';
  var c=drawImg(src,s,white);
  if(!o.targetKB){var b0=await encode(c,o.type,o.q);freeCanvas(c);return {blob:b0,hit:true}}
  var target=o.targetKB*1024,best=null;
  for(var a=0;a<7;a++){
    if(o.type==='image/png'){
      var bp=await encode(c,o.type);best=bp;
      if(bp.size<=target){freeCanvas(c);return {blob:bp,hit:true}}
    }else{
      var bh=await encode(c,o.type,0.95);
      if(bh.size<=target){freeCanvas(c);return {blob:bh,hit:true}}
      var lo=0.05,hi=0.95,ok=null;
      for(var i=0;i<7;i++){var mid=(lo+hi)/2,bm=await encode(c,o.type,mid);if(bm.size<=target){ok=bm;lo=mid}else hi=mid}
      if(ok){freeCanvas(c);return {blob:ok,hit:true}}
      best=await encode(c,o.type,0.05);
    }
    s*=0.82;freeCanvas(c);c=drawImg(src,s,white);
  }
  freeCanvas(c);return {blob:best,hit:best.size<=target};
}

export { loadImage, dims, drawImg, EXT, encode, pickType, compressOne };
