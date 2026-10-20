import { baseName } from './../core/utils.js';
import { smP } from './../core/runtime.js';
import { openPdf, parseRange, pageText, toParas } from './../helpers/pdf.js';
import { dPara, D_BREAK, buildDocx } from './../helpers/docx.js';
import { textToPdf } from './../helpers/translation-pdf.js';
import { PW, LANGS } from './../tools/options.js';

export default {id:'pdf-translate',group:'จัดการ PDF',nav:'แปลภาษา PDF',hint:'PDF → PDF DOCX TXT',kind:'pdf',multi:false,needSample:true,
 title:'แปลภาษาไฟล์ PDF',desc:'อ่านข้อความจาก PDF แล้วให้ Claude แปลเป็นภาษาที่เลือก ได้ไฟล์ PDF, Word และข้อความล้วน',
 from:['.pdf'],to:['.pdf','.docx','.txt'],cta:'แปลไฟล์',
 options:[
  {id:'lang',label:'แปลเป็นภาษา',type:'select',def:'Thai',choices:LANGS},
  {id:'range',label:'หน้าที่ต้องการแปล',type:'text',def:'',hint:'เว้นว่างเพื่อแปลทุกหน้า หรือพิมพ์ เช่น 1-5'},
  PW],
 note:'บนเว็บ Vercel ยังใช้การแปลไม่ได้ เพราะต้องเปิดผ่าน Claude เท่านั้น ข้อความจากไฟล์จะถูกส่งให้ Claude เพื่อแปล และนับรวมกับโควตาการใช้ Claude ของคุณ ครั้งแรกระบบจะขออนุญาตก่อน PDF ที่ได้จะเป็นข้อความล้วนจัดหน้าใหม่ ไม่คงรูปแบบเดิม',
 warn:true,
 run:async function(c){
  var sm=await smP;
  if(!sm)throw new Error('เครื่องมือนี้ใช้ได้เมื่อเปิดหน้านี้ผ่าน Claude เท่านั้น (ต้องใช้ Claude ช่วยแปล)');
  var f=c.files[0],pdf=await openPdf(f,c.v.pw),pages=parseRange(c.v.range,pdf.numPages),lang=c.v.lang,langTh=(LANGS.filter(function(l){return l[0]===lang})[0]||[])[1]||lang;
  var items=[],per=[],chars=0;
  for(var k=0;k<pages.length;k++){
   c.chk();c.set(0.05*k/pages.length,'อ่านข้อความหน้า '+pages[k]);
   var pt=await pageText(await pdf.getPage(pages[k])),ps=toParas(pt);chars+=pt.chars;
   per.push(ps.map(function(q){var it={i:items.length,text:q.text,pg:k};items.push(it);return it}));
  }
  if(chars<15)throw new Error('ไม่พบข้อความในไฟล์นี้ (อาจเป็นภาพสแกน) เครื่องมือนี้ยังอ่านข้อความจากภาพไม่ได้');
  var batches=[],cur=[],len=0;
  items.forEach(function(it){if(cur.length&&(len+it.text.length>4500||cur.length>=50)){batches.push(cur);cur=[];len=0}cur.push(it);len+=it.text.length});
  if(cur.length)batches.push(cur);
  var miss=0;
  for(var b=0;b<batches.length;b++){
   c.chk();c.set(0.05+0.8*b/batches.length,'กำลังแปล ส่วนที่ '+(b+1)+' จาก '+batches.length);
   var prompt='Translate the "t" value of every object in the JSON array below into '+lang+'. Keep numbers, URLs, names, and symbols as they are. Reply with only a JSON array of objects {"i":number,"t":string}, one per input object, using the same "i" values.\n\n'+JSON.stringify(batches[b].map(function(x){return {i:x.i,t:x.text}}));
   var out;
   try{out=await sm.json(prompt,{signal:c.signal})}
   catch(e){
    if(e&&e.code==='cancelled')throw Object.assign(new Error('ยกเลิกแล้ว'),{cancelled:true});
    var msg={not_granted:'คุณไม่ได้อนุญาตให้ใช้ Claude แปลไฟล์',rate_limited:'ใช้ Claude ถี่เกินไปหรือถึงขีดจำกัดการใช้งานแล้ว ลองใหม่ภายหลัง',session_expired:'เซสชันหมดอายุ กรุณาเข้าสู่ระบบ Claude ใหม่',sampling_disabled:'บัญชีนี้ใช้ Claude ในหน้านี้ไม่ได้',invalid_json:'Claude ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้ง',prompt_too_large:'ข้อความยาวเกินไป ลองเลือกช่วงหน้าที่สั้นลง'}[e&&e.code];
    throw new Error(msg||'แปลไม่สำเร็จ ลองใหม่อีกครั้ง');
   }
   var map={};(Array.isArray(out)?out:[]).forEach(function(r){if(r&&typeof r.t==='string')map[r.i]=r.t});
   batches[b].forEach(function(it){if(map[it.i]===undefined){miss++;it.out=it.text}else it.out=map[it.i]});
  }
  var pagesOut=per.map(function(ps){return ps.map(function(it){return it.out})});
  var base=baseName(f.name)+'-'+lang.toLowerCase().replace(/\s+/g,'-');
  c.set(0.88,'สร้างไฟล์ผลลัพธ์');
  var pdfBlob=await textToPdf(pagesOut,c.set,c.chk);
  var body='';pagesOut.forEach(function(ps,pi){ps.forEach(function(t){body+=dPara(t)});if(pi<pagesOut.length-1)body+=D_BREAK});
  var docx=await buildDocx(body,[]);
  var txt=new Blob([pagesOut.map(function(ps,pi){return '--- หน้า '+pages[pi]+' ---\n\n'+ps.join('\n\n')}).join('\n\n')],{type:'text/plain'});
  var n=miss?' · '+miss+' ย่อหน้าแปลไม่ได้ คงข้อความเดิมไว้':'';
  c.add({name:base+'.pdf',blob:pdfBlob,note:'แปลเป็น'+langTh+' · '+pages.length+' หน้าต้นฉบับ'+n,cls:miss?'w':''});
  c.add({name:base+'.docx',blob:docx,note:'ไฟล์ Word แก้ไขต่อได้'});
  c.add({name:base+'.txt',blob:txt,note:'ข้อความล้วน'});
 }};
