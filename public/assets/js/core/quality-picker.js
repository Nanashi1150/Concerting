import { fmtB } from './utils.js';
import { loadImage } from '../helpers/images.js';
import { QUALITY_PRESETS, imageOutput } from '../helpers/image-quality.js';

export function createQualityPicker(id,value){
  var element=document.createElement('div');element.className='quality-picker';
  var input=document.createElement('input');input.type='hidden';input.id=id;input.value=value;
  var grid=document.createElement('div');grid.className='quality-grid';element.appendChild(grid);
  var sizes=QUALITY_PRESETS.map(function(preset){
    var label=document.createElement('label');label.className='quality-choice';
    var radio=document.createElement('input');radio.type='radio';radio.name=id+'_level';radio.value=preset.id;radio.checked=preset.id===value;
    radio.addEventListener('change',function(){if(radio.checked){input.value=preset.id;input.dispatchEvent(new Event('change'))}});
    var text=document.createElement('span');text.className='quality-label';text.textContent=preset.label;
    var size=document.createElement('small');size.className='quality-size';size.textContent='เลือกไฟล์เพื่อดูขนาด';
    label.appendChild(radio);label.appendChild(text);label.appendChild(size);grid.appendChild(label);return size;
  });
  var hint=document.createElement('div');hint.className='hint';hint.setAttribute('aria-live','polite');element.appendChild(hint);
  var details=document.createElement('details');details.className='quality-details';details.hidden=true;
  var summary=document.createElement('summary');summary.textContent='ดูขนาดแยกตามไฟล์';details.appendChild(summary);
  var tableWrap=document.createElement('div');tableWrap.className='quality-table-wrap';details.appendChild(tableWrap);element.appendChild(details);
  var version=0,timer=null,disposed=false,lastFiles=[],lastSettings=null;

  function update(files,values,tool){
    var settings=JSON.stringify([values.fmt,values.mode,values.kb]);
    if(settings===lastSettings&&files.length===lastFiles.length&&files.every(function(f,i){return f===lastFiles[i]}))return;
    lastSettings=settings;lastFiles=files.slice();
    var token=++version;clearTimeout(timer);
    details.hidden=true;tableWrap.textContent='';
    var compress=tool.id==='img-compress';
    hint.textContent='JPG และ WebP ใช้ระดับคุณภาพสูง / กลาง / ต่ำ ไม่ใช่เปอร์เซ็นต์ขนาดไฟล์ที่ลดลง '+(compress?'PNG ระดับกลางและต่ำจะลดทั้งความกว้างและความสูงเหลือประมาณ 80% และ 60% ของภาพต้นฉบับ':'PNG ไม่ใช้ค่าคุณภาพนี้ จึงได้ขนาดเท่ากันทั้ง 3 ระดับ');
    if(!files.length||values.mode==='t'){
      sizes.forEach(function(size){size.textContent='เลือกไฟล์เพื่อดูขนาด';size.title=''});return;
    }
    sizes.forEach(function(size){size.textContent='กำลังคำนวณ…';size.title=''});
    var snapshot=Object.assign({},values),selected=files.slice();
    function stale(){return disposed||version!==token}
    timer=setTimeout(async function(){
      var rows=[],totals=[0,0,0],success=0;
      for(var f of selected){
        if(stale())return;
        var src=null,row={name:f.name,sizes:[]};
        try{
          src=await loadImage(f);
          if(stale())return;
          for(var i=0;i<QUALITY_PRESETS.length;i++){
            var output=await imageOutput(src,f,Object.assign({},snapshot,{q:QUALITY_PRESETS[i].id}),compress);
            if(stale())return;
            row.sizes.push(output.blob.size);
            if(!compress&&output.blob.type==='image/png'){row.sizes=[output.blob.size,output.blob.size,output.blob.size];break}
          }
          row.sizes.forEach(function(size,index){totals[index]+=size});success++;
        }catch(error){row.sizes=[];row.error=error.message||'อ่านภาพไม่ได้'}
        finally{if(src&&typeof src.close==='function')src.close()}
        rows.push(row);
      }
      if(stale())return;
      sizes.forEach(function(size,index){size.textContent=success?(selected.length>1?'รวม ':'')+fmtB(totals[index])+(success<selected.length?' · '+success+'/'+selected.length+' ไฟล์':''):'คำนวณไม่ได้';size.title=success?totals[index]+' bytes':''});
      hint.textContent+=' · ขนาดคำนวณจากภาพจริงตามค่าปัจจุบัน'+(selected.length>1?' (รวม '+selected.length+' ไฟล์)':'')+(success<selected.length?' · บางภาพคำนวณไม่ได้ โปรดตรวจรายละเอียด':'');
      var table=document.createElement('table');
      var head=document.createElement('thead'),tr=document.createElement('tr');
      ['ไฟล์','สูง','กลาง','ต่ำ'].forEach(function(text){var cell=document.createElement('th');cell.scope='col';cell.textContent=text;tr.appendChild(cell)});
      head.appendChild(tr);table.appendChild(head);
      var body=document.createElement('tbody');
      rows.forEach(function(row){
        var tr=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=row.name;tr.appendChild(name);
        for(var i=0;i<3;i++){var cell=document.createElement('td');cell.textContent=row.error?'คำนวณไม่ได้':fmtB(row.sizes[i]);cell.title=row.error||row.sizes[i]+' bytes';tr.appendChild(cell)}
        body.appendChild(tr);
      });
      table.appendChild(body);tableWrap.appendChild(table);details.hidden=selected.length===1&&success===1;
    },180);
  }

  return {element:element,input:input,update:update,dispose:function(){disposed=true;version++;clearTimeout(timer)}};
}
