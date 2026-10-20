import { fmtB, baseName, need } from './../core/utils.js';
import { openPdf, pageText } from './../helpers/pdf.js';
import { PW } from './../tools/options.js';

export default {id:'pdf-xlsx',group:'PDF เป็นไฟล์อื่น',nav:'PDF เป็น Excel',hint:'PDF → XLSX',kind:'pdf',multi:true,
 title:'แปลง PDF เป็น Excel (.xlsx)',desc:'ดึงข้อความและตารางจาก PDF มาจัดเป็นแถวและคอลัมน์ ตัวเลขจะถูกแปลงเป็นค่าตัวเลขให้คำนวณต่อได้',
 from:['.pdf'],to:['.xlsx'],cta:'แปลงเป็น Excel',
 options:[
  {id:'mode',label:'การจัดชีต',type:'select',def:'each',choices:[['each','หนึ่งหน้า ต่อหนึ่งชีต'],['one','รวมทุกหน้าในชีตเดียว']]},
  PW],
 note:'ใช้ได้ดีกับ PDF ที่สร้างจากโปรแกรม (ไม่ใช่ภาพสแกน) การแบ่งคอลัมน์อิงจากตำแหน่งข้อความ จึงควรตรวจสอบผลอีกครั้ง',
 run:async function(c){
  var X=need('XLSX');
  function val(s){if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)||/^-?(?!0\d)\d+(\.\d+)?$/.test(s))return Number(s.replace(/,/g,''));return s}
  function rowsOf(pt){
   var per=pt.lines.map(function(l){
    var cells=[],cur=null;
    l.items.forEach(function(it){
     if(cur&&it.x-(cur.x+cur.w)<=l.h*0.9){cur.s+=(it.x-(cur.x+cur.w)>l.h*0.18?' ':'')+it.s;cur.w=it.x+it.w-cur.x}
     else{cur={s:it.s,x:it.x,w:it.w};cells.push(cur)}
    });
    return cells;
   });
   var xs=Array.from(new Set([].concat.apply([],per).map(function(q){return Math.round(q.x)}))).sort(function(a,b){return a-b}),cols=[];
   xs.forEach(function(x){if(!cols.length||x-cols[cols.length-1].max>8)cols.push({min:x,max:x});else cols[cols.length-1].max=x});
   function colOf(x){var best=0,bd=1e9;cols.forEach(function(q,i){var d=Math.abs(x-(q.min+q.max)/2);if(d<bd){bd=d;best=i}});return best}
   return per.map(function(cells){var row=[];cells.forEach(function(q){var i=colOf(q.x);while(row[i]!==undefined)i++;row[i]=val(q.s.trim())});return row});
  }
  function widths(rows){var w=[];rows.forEach(function(r){for(var i=0;i<r.length;i++){if(r[i]===undefined)continue;var n=String(r[i]).length;w[i]=Math.max(w[i]||8,Math.min(60,n+2))}});return w.map(function(x){return {wch:x||8}})}
  for(var i=0;i<c.files.length;i++){
   var f=c.files[i];
   try{
    var pdf=await openPdf(f,c.v.pw),wb=X.utils.book_new(),all=[],empty=0;
    for(var p=1;p<=pdf.numPages;p++){
     c.chk();c.set((i+p/pdf.numPages)/c.files.length,f.name+' หน้า '+p+' จาก '+pdf.numPages);
     var pt=await pageText(await pdf.getPage(p)),rows=rowsOf(pt);
     if(pt.chars<15){empty++;rows=[['(หน้านี้ไม่มีข้อความ อาจเป็นภาพสแกน)']]}
     if(c.v.mode==='one'){if(all.length)all.push([]);all.push(['— หน้า '+p+' —']);all=all.concat(rows)}
     else{var ws=X.utils.aoa_to_sheet(rows);ws['!cols']=widths(rows);X.utils.book_append_sheet(wb,ws,'หน้า '+p)}
    }
    if(c.v.mode==='one'){var w1=X.utils.aoa_to_sheet(all);w1['!cols']=widths(all);X.utils.book_append_sheet(wb,w1,'ทุกหน้า')}
    var blob=new Blob([X.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    c.add({name:baseName(f.name)+'.xlsx',blob:blob,note:pdf.numPages+' หน้า · '+fmtB(blob.size)+(empty?' · '+empty+' หน้าไม่มีข้อความ':''),cls:empty?'w':''});
   }catch(e){c.fail(f.name,e)}
  }
 }};
