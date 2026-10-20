import { $, fmtB, toast, need } from './core/utils.js';
import { saveFile } from './core/runtime.js';
import { IMG_ACCEPT } from './tools/options.js';
import { TOOLS, BYID } from './tools/index.js';
import { animateToolChange } from './core/motion.js';

/* ---------- UI state ---------- */
var cur=TOOLS[0],files=[],results=[],urls=[],saved={},ctl=null,busy=false;
var pageReady=false;
var els={nav:$('#nav'),drop:$('#drop'),picker:$('#picker'),flist:$('#flist'),opts:$('#opts'),note:$('#note'),run:$('#run'),stop:$('#stop'),clear:$('#clear'),prog:$('#prog'),barI:$('#barI'),progT:$('#progT'),resCard:$('#resCard'),rl:$('#rl'),ftr:$('#ftr'),resErr:$('#resErr'),resH:$('#resH')};

function renderNav(){
  els.nav.innerHTML='';var g=null;
  TOOLS.forEach(function(t){
    if(t.group!==g){g=t.group;var h=document.createElement('div');h.className='grp';h.textContent=g;els.nav.appendChild(h)}
    var b=document.createElement('button');b.type='button';b.className='nb';b.dataset.id=t.id;
    b.innerHTML='<strong></strong><small></small>';b.firstChild.textContent=t.nav;b.lastChild.textContent=t.hint;
    b.setAttribute('aria-current',t.id===cur.id?'true':'false');
    b.addEventListener('click',function(){if(busy)return;select(t.id)});
    els.nav.appendChild(b);
  });
}
function select(id){
  if(busy)return;
  if(pageReady&&cur===(BYID[id]||TOOLS[0]))return;
  cur=BYID[id]||TOOLS[0];files=[];clearResults();
  $('#tTitle').textContent=cur.title;$('#tDesc').textContent=cur.desc;
  var f=$('#tFmt');f.innerHTML='';
  function chips(a){a.forEach(function(x){var s=document.createElement('span');s.className='chip';s.textContent=x;f.appendChild(s)})}
  chips(cur.from);var ar=document.createElement('span');ar.className='arrow';ar.textContent='→';f.appendChild(ar);chips(cur.to);
  els.picker.accept=cur.kind==='pdf'?'application/pdf,.pdf':IMG_ACCEPT;els.picker.multiple=!!cur.multi;
  $('#dropS').textContent=(cur.kind==='pdf'?'รับไฟล์ .pdf':'รับไฟล์ภาพ .jpg .png .webp .gif .bmp')+(cur.multi?' เลือกได้หลายไฟล์':' ครั้งละ 1 ไฟล์');
  els.run.textContent=cur.cta;
  renderOpts();renderFiles();updateNote();
  els.run.disabled=!!(cur.needSample&&!window.claude);
  Array.prototype.forEach.call(els.nav.querySelectorAll('.nb'),function(b){b.setAttribute('aria-current',b.dataset.id===cur.id?'true':'false')});
  animateToolChange($('main'),els.nav.querySelector('[data-id="'+cur.id+'"]'));
  pageReady=true;
}
function updateNote(){
  var n=cur.note||'';
  if(cur.needSample&&!window.claude) n='การแปล PDF ใช้ได้เมื่อเปิดผ่าน Claude เท่านั้น ยังไม่รองรับบนเว็บ Vercel';
  els.note.textContent=n;els.note.classList.toggle('warn',!!cur.warn);
}
function vals(){
  var v={},s=saved[cur.id]||{};
  (cur.options||[]).forEach(function(o){
    var e=document.getElementById('o_'+o.id);
    if(!e){v[o.id]=s[o.id]!==undefined?s[o.id]:o.def;return}
    v[o.id]=o.type==='checkbox'?e.checked:o.type==='range'?Number(e.value):e.value;
  });
  return v;
}
function renderOpts(){
  els.opts.innerHTML='';var sv=saved[cur.id]=saved[cur.id]||{};
  (cur.options||[]).forEach(function(o){
    var w=document.createElement('div');w.className='opt'+(o.type==='checkbox'?' ck':'');w.dataset.opt=o.id;
    var val=sv[o.id]!==undefined?sv[o.id]:o.def,id='o_'+o.id,inp;
    function lab(){var l=document.createElement('label');l.htmlFor=id;l.textContent=o.label;return l}
    if(o.type==='select'){
      w.appendChild(lab());inp=document.createElement('select');
      o.choices.forEach(function(c){var op=document.createElement('option');op.value=c[0];op.textContent=c[1];inp.appendChild(op)});inp.value=val;
    }else if(o.type==='range'){
      var l=lab(),rv=document.createElement('span');rv.className='rv';l.appendChild(document.createTextNode(' '));l.appendChild(rv);w.appendChild(l);
      inp=document.createElement('input');inp.type='range';inp.min=o.min;inp.max=o.max;inp.step=o.step||1;inp.value=val;
      var up=function(){rv.textContent=inp.value+(o.unit||'')};up();inp.addEventListener('input',up);
    }else if(o.type==='checkbox'){
      inp=document.createElement('input');inp.type='checkbox';inp.checked=!!val;w.appendChild(inp);w.appendChild(lab());
    }else{
      w.appendChild(lab());inp=document.createElement('input');inp.type=o.type;inp.value=val;
      if(o.type==='number'){inp.min=o.min;inp.max=o.max;inp.inputMode='numeric'}
      if(o.type==='password')inp.autocomplete='new-password';
    }
    inp.id=id;
    var ev=o.type==='checkbox'||o.type==='select'?'change':'input';
    inp.addEventListener(ev,function(){sv[o.id]=o.type==='checkbox'?inp.checked:o.type==='range'?Number(inp.value):inp.value;applyWhen()});
    if(o.type!=='checkbox')w.appendChild(inp);
    if(o.hint){var h=document.createElement('div');h.className='hint';h.textContent=o.hint;w.appendChild(h)}
    els.opts.appendChild(w);
  });
  applyWhen();
}
function applyWhen(){
  var v=vals();
  (cur.options||[]).forEach(function(o){
    var w=els.opts.querySelector('[data-opt="'+o.id+'"]');
    if(w)w.hidden=o.when?!o.when(v):false;
  });
}
function renderFiles(){
  els.flist.innerHTML='';
  files.forEach(function(f,i){
    var li=document.createElement('li');li.className='fi';
    var n=document.createElement('span');n.className='n';n.textContent=f.name;n.title=f.name;
    var s=document.createElement('span');s.className='s';s.textContent=fmtB(f.size);
    li.appendChild(n);li.appendChild(s);
    if(cur.ordered){
      [['▲',-1,'เลื่อนขึ้น'],['▼',1,'เลื่อนลง']].forEach(function(a){
        var b=document.createElement('button');b.type='button';b.className='ib';b.textContent=a[0];b.setAttribute('aria-label',a[2]+' '+f.name);
        b.disabled=busy||(i+a[1]<0)||(i+a[1]>=files.length);
        b.addEventListener('click',function(){var t=files[i];files[i]=files[i+a[1]];files[i+a[1]]=t;renderFiles()});
        li.appendChild(b);
      });
    }
    var x=document.createElement('button');x.type='button';x.className='ib';x.textContent='✕';x.setAttribute('aria-label','เอา '+f.name+' ออก');x.disabled=busy;
    x.addEventListener('click',function(){files.splice(i,1);renderFiles()});
    li.appendChild(x);els.flist.appendChild(li);
  });
}
function addFiles(list){
  var arr=Array.prototype.slice.call(list||[]),ok=[],bad=0;
  arr.forEach(function(f){
    var isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name),isImg=/^image\//.test(f.type)||/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name);
    if((cur.kind==='pdf'&&isPdf)||(cur.kind==='image'&&isImg))ok.push(f);else bad++;
  });
  if(bad)toast('ข้ามไฟล์ที่ประเภทไม่ตรงกับเครื่องมือนี้ '+bad+' ไฟล์');
  if(!ok.length)return;
  files=cur.multi?files.concat(ok):[ok[0]];
  clearResults();renderFiles();
}
function clearResults(){
  urls.forEach(function(u){URL.revokeObjectURL(u)});urls=[];results=[];
  els.resCard.hidden=true;els.rl.innerHTML='';els.ftr.innerHTML='';els.resErr.innerHTML='';
}
function setProg(f,t){
  els.prog.hidden=false;els.barI.style.width=Math.round(Math.max(0,Math.min(1,f))*100)+'%';if(t)els.progT.textContent=t;
}
function resultItem(r){
  var d=document.createElement('div');d.className='ri';
  var th=document.createElement('div');th.className='th';
  if(/^image\//.test(r.blob.type)){var u=URL.createObjectURL(r.blob);urls.push(u);var im=document.createElement('img');im.src=u;im.alt='';th.appendChild(im)}
  else th.textContent='.'+(r.name.split('.').pop()||'').toLowerCase();
  var m=document.createElement('div');m.className='m';
  var b=document.createElement('b');b.textContent=r.name;var s=document.createElement('small');s.textContent=(r.note||'')+(r.note?' · ':'')+fmtB(r.blob.size);
  if(r.cls)s.className=r.cls;
  m.appendChild(b);m.appendChild(s);
  var btn=document.createElement('button');btn.type='button';btn.className='btn sm primary';btn.textContent='บันทึก';
  btn.addEventListener('click',function(){saveFile(r.name,r.blob)});
  d.appendChild(th);d.appendChild(m);d.appendChild(btn);return d;
}
function renderFooter(){
  els.ftr.innerHTML='';
  if(results.length>1){
    var b=document.createElement('button');b.type='button';b.className='btn';b.textContent='บันทึกทั้งหมดเป็น .zip ('+results.length+' ไฟล์)';
    b.addEventListener('click',async function(){
      b.disabled=true;
      try{
        var Z=need('JSZip'),z=new Z(),used={};
        results.forEach(function(r){var n=r.name;if(used[n]){var e=n.lastIndexOf('.');n=n.slice(0,e)+'-'+used[n]+n.slice(e);used[r.name]++}else used[n]=1;z.file(n,r.blob)});
        var zb=await z.generateAsync({type:'blob',compression:'STORE'});
        await saveFile('converted-files.zip',zb);
      }catch(e){toast('สร้างไฟล์ zip ไม่สำเร็จ')}
      b.disabled=false;
    });
    els.ftr.appendChild(b);
  }
}
function setBusy(b){
  busy=b;els.run.disabled=b;els.clear.disabled=b;els.stop.hidden=!b;
  Array.prototype.forEach.call(els.opts.querySelectorAll('input,select'),function(e){e.disabled=b});
  renderFiles();
}
async function run(){
  if(busy)return;
  if(!files.length){toast('เลือกไฟล์ก่อน');return}
  var v=vals(),bad=cur.validate&&cur.validate(v,files);
  if(bad){toast(bad);return}
  clearResults();els.resCard.hidden=false;els.resH.textContent='ผลลัพธ์';
  ctl=new AbortController();setBusy(true);setProg(0,'เริ่มทำงาน');
  var errs=[];
  var ctx={files:files.slice(),v:v,signal:ctl.signal,
    set:setProg,
    chk:function(){if(ctl.signal.aborted)throw Object.assign(new Error('ยกเลิกแล้ว'),{cancelled:true})},
    add:function(r){results.push(r);els.rl.appendChild(resultItem(r));renderFooter()},
    fail:function(name,e){if(e&&e.cancelled)throw e;errs.push((name?name+': ':'')+(e&&e.message||'เกิดข้อผิดพลาด'))}
  };
  try{await cur.run(ctx);setProg(1,'เสร็จแล้ว')}
  catch(e){if(e&&e.cancelled){toast('ยกเลิกแล้ว')}else errs.push(e&&e.message||'เกิดข้อผิดพลาดที่ไม่คาดคิด')}
  finally{setBusy(false);ctl=null}
  els.resErr.innerHTML='';
  errs.forEach(function(m){var d=document.createElement('div');d.className='err';d.style.marginBottom='8px';d.textContent=m;els.resErr.appendChild(d)});
  if(results.length)els.resH.textContent='ผลลัพธ์ '+results.length+' ไฟล์';
  else if(!errs.length)els.resCard.hidden=true;
  setTimeout(function(){els.prog.hidden=true},900);
  if(!els.resCard.hidden)els.resCard.scrollIntoView({behavior:'smooth',block:'nearest'});
}

/* ---------- wiring ---------- */
els.drop.addEventListener('click',function(){if(!busy)els.picker.click()});
els.drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!busy)els.picker.click()}});
els.picker.addEventListener('change',function(){addFiles(els.picker.files);els.picker.value=''});
['dragenter','dragover'].forEach(function(n){els.drop.addEventListener(n,function(e){e.preventDefault();els.drop.classList.add('over')})});
['dragleave','drop'].forEach(function(n){els.drop.addEventListener(n,function(e){e.preventDefault();els.drop.classList.remove('over')})});
els.drop.addEventListener('drop',function(e){if(!busy)addFiles(e.dataTransfer&&e.dataTransfer.files)});
els.run.addEventListener('click',run);
els.stop.addEventListener('click',function(){if(ctl)ctl.abort()});
els.clear.addEventListener('click',function(){files=[];clearResults();renderFiles();els.prog.hidden=true});

renderNav();
var h=(location.hash||'').replace('#','');
select(BYID[h]?h:TOOLS[0].id);
