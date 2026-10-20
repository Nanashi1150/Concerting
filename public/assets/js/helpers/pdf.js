import { need, toBlob, mkCanvas, freeCanvas } from './../core/utils.js';

/* ---------- PDF helpers ---------- */
var pdfReady=false;
function pdfjs(){
  var p=need('pdfjsLib');
  if(!pdfReady){p.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';pdfReady=true}
  return p;
}
async function openPdf(file,password){
  var lib=pdfjs(),data=new Uint8Array(await file.arrayBuffer());
  try{return await lib.getDocument({data:data,password:password||undefined}).promise}
  catch(e){
    if(e&&e.name==='PasswordException')throw new Error(e.code===2?'รหัสผ่านไม่ถูกต้อง':'ไฟล์ "'+file.name+'" ต้องใช้รหัสผ่านเพื่อเปิด ใส่รหัสผ่านในช่องด้านบน');
    throw new Error('เปิดไฟล์ PDF "'+file.name+'" ไม่ได้ ไฟล์อาจเสียหาย');
  }
}
async function renderPage(page,scale){
  var base=page.getViewport({scale:1});
  scale=Math.min(scale,8000/Math.max(base.width,base.height));
  var vp=page.getViewport({scale:scale}),c=mkCanvas(vp.width,vp.height),x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:x,viewport:vp}).promise;
  return c;
}
function parseRange(s,n){
  s=(s||'').trim();
  if(!s)return Array.from({length:n},function(_,i){return i+1});
  var set=new Set();
  s.split(/[,\s]+/).forEach(function(p){
    if(!p)return;var m=p.match(/^(\d+)(?:-(\d+))?$/);
    if(!m)throw new Error('ช่วงหน้าไม่ถูกต้อง: '+p);
    var a=+m[1],b=m[2]?+m[2]:a;if(a>b){var t=a;a=b;b=t}
    for(var i=Math.max(1,a);i<=Math.min(n,b);i++)set.add(i);
  });
  if(!set.size)throw new Error('ไม่มีหน้าตามช่วงที่ระบุ (ไฟล์มี '+n+' หน้า)');
  return Array.from(set).sort(function(a,b){return a-b});
}
async function pageText(page){
  var vp=page.getViewport({scale:1}),tc=await page.getTextContent(),its=[];
  tc.items.forEach(function(it){
    if(typeof it.str!=='string'||!it.str.trim())return;
    var t=it.transform;
    its.push({s:it.str,x:t[4],y:t[5],h:Math.abs(it.height)||Math.hypot(t[2],t[3])||10,w:it.width||0});
  });
  its.sort(function(a,b){return (b.y-a.y)||(a.x-b.x)});
  var lines=[];
  its.forEach(function(it){
    var l=lines[lines.length-1];
    if(l&&Math.abs(l.y-it.y)<=Math.max(2,Math.min(l.h,it.h)*0.45)){l.items.push(it);l.h=Math.max(l.h,it.h)}
    else lines.push({y:it.y,h:it.h,items:[it]});
  });
  lines.forEach(function(l){
    l.items.sort(function(a,b){return a.x-b.x});
    var t='',prev=null;
    l.items.forEach(function(it){
      if(prev){var gap=it.x-(prev.x+prev.w);if(gap>l.h*0.18&&!/\s$/.test(t)&&!/^\s/.test(it.s))t+=' '}
      t+=it.s;prev=it;
    });
    l.text=t.trim();l.x=l.items[0].x;
    l.right=Math.max.apply(null,l.items.map(function(i){return i.x+i.w}));
  });
  var chars=lines.reduce(function(n,l){return n+l.text.length},0);
  return {w:vp.width,h:vp.height,lines:lines,chars:chars};
}
var CJK=/[฀-๿぀-ヿ㐀-鿿가-힯]/;
function toParas(pt){
  var out=[],cur=null,prev=null;
  if(!pt.lines.length)return out;
  var minX=Math.min.apply(null,pt.lines.map(function(l){return l.x})),maxR=Math.max.apply(null,pt.lines.map(function(l){return l.right}));
  pt.lines.forEach(function(l){
    if(!l.text)return;
    var np=!cur||(prev.y-l.y)>prev.h*1.75||Math.abs(l.h-prev.h)>prev.h*0.15||prev.right<minX+(maxR-minX)*0.7;
    if(np){cur={text:l.text,size:l.h};out.push(cur)}
    else{
      var join=(CJK.test(cur.text.slice(-1))&&CJK.test(l.text.charAt(0)))?'':' ';
      cur.text+=join+l.text;
    }
    prev=l;
  });
  return out;
}
async function pdfPagesJpeg(file,pw,scale,q,set,chk){
  var pdf=await openPdf(file,pw),out=[];
  for(var i=1;i<=pdf.numPages;i++){
    chk();
    var pg=await pdf.getPage(i),b=pg.getViewport({scale:1}),c=await renderPage(pg,scale);
    out.push({jpg:new Uint8Array(await (await toBlob(c,'image/jpeg',q)).arrayBuffer()),w:b.width,h:b.height});
    freeCanvas(c);set((i/pdf.numPages)*0.9,'อ่านหน้า '+i+' จาก '+pdf.numPages);
  }
  return out;
}

export { openPdf, renderPage, parseRange, pageText, toParas, pdfPagesJpeg };
