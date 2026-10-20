import { toast } from './../core/utils.js';

/* ---------- runtime capabilities ---------- */
function useCap(n){try{return window.claude&&window.claude.use?window.claude.use(n).catch(function(){return null}):Promise.resolve(null)}catch(e){return Promise.resolve(null)}}
var DL=null,SAMPLE=null;
var dlP=useCap('downloads').then(function(x){DL=x;return x});
var smP=useCap('sample').then(function(x){SAMPLE=x;return x});

async function saveFile(name,blob){
  await dlP;
  if(DL){
    try{await DL.save({filename:name,data:blob});toast('บันทึกแล้ว')}
    catch(e){
      if(e&&e.code==='declined')return;
      if(e&&e.code==='rejected_extension'){toast('บันทึกไฟล์ประเภทนี้ไม่ได้');return}
      toast('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    }
    return;
  }
  try{var a=document.createElement('a');var url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},60000);toast('กำลังบันทึกไฟล์')}
  catch(e){toast('เบราว์เซอร์นี้บันทึกไฟล์จากหน้านี้ไม่ได้')}
}

export { saveFile, smP };
