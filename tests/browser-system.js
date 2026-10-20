var report={browser:navigator.userAgent,checks:0,cases:[],limitations:[
  'Claude translation is tested with a deterministic local stub; external Claude account access is not available.',
  'Office files are checked as ZIP/XML workbooks and presentations; visual rendering in Microsoft Office is not tested.',
  'Files and network downloads are tested in a local isolated browser, not on a deployed Vercel site.'
]};
var runtimeErrors=[];
window.addEventListener('error',function(event){if(event.message)runtimeErrors.push(event.message)});
window.addEventListener('unhandledrejection',function(event){runtimeErrors.push(String(event.reason))});
function check(value,message){if(!value)throw new Error(message);report.checks++}
async function save(path,blob){var response=await fetch('/artifact?path='+encodeURIComponent(path),{method:'POST',body:blob});check(response.ok,'Artifact save failed: '+path)}
async function test(name,action){
  await fetch('/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})});
  try{await action();report.cases.push({name:name,status:'PASS'})}
  catch(error){report.cases.push({name:name,status:'FAIL',error:error.message});throw error}
}
async function waitFor(condition,message,timeout=20000){
  var deadline=Date.now()+timeout;
  while(!condition()){if(Date.now()>deadline)throw new Error(message||'Timed out');await new Promise(function(resolve){setTimeout(resolve,25)})}
}
async function encode(canvas,type='image/png'){return new Promise(function(resolve){canvas.toBlob(resolve,type,0.9)})}
function xml(text){var parsed=new DOMParser().parseFromString(text,'application/xml');check(!parsed.querySelector('parsererror'),'Invalid XML');return parsed}
var sampleMode='ok';
window.claude={use:async function(name){return name==='sample'?{json:async function(prompt,options){
  if(sampleMode==='rate')throw {code:'rate_limited'};
  if(options.signal.aborted)throw {code:'cancelled'};
  return JSON.parse(prompt.slice(prompt.indexOf('\n\n')+2)).map(function(item){return {i:item.i,t:'Translated: '+item.t}});
}}:null}};

try{
  await waitFor(function(){return window.PDFLib&&window.pdfjsLib&&window.JSZip&&window.XLSX&&(window.PptxGenJS||window.pptxgen)&&window.jspdf},'CDN libraries did not load',30000);
  var {TOOLS,BYID}=await import('/assets/js/tools/index.js');
  var {parseRange,openPdf,pageText,toParas}=await import('/assets/js/helpers/pdf.js');
  var {animateToolChange}=await import('/assets/js/core/motion.js');
  var fixtures={},textPdf,protectedPdf;
  async function run(id,files,values={},options={}){
    var tool=BYID[id],v=Object.fromEntries(tool.options.map(function(o){return [o.id,o.def]}));Object.assign(v,values);
    var outputs=[],errors=[],controller=new AbortController();
    var context={files:files,v:v,signal:controller.signal,set:function(){if(options.abort)controller.abort()},chk:function(){if(controller.signal.aborted)throw Object.assign(new Error('Cancelled'),{cancelled:true})},add:function(result){outputs.push(result)},fail:function(name,error){if(error.cancelled)throw error;errors.push({name:name,error:error})}};
    if(options.signal)context.signal=options.signal;
    var invalid=tool.validate&&tool.validate(v,files);if(invalid)throw new Error(invalid);
    await tool.run(context);
    if(!options.allowErrors&&errors.length)throw errors[0].error;
    return {outputs:outputs,errors:errors};
  }
  async function inspectPdf(blob,password){var doc=await openPdf(new File([blob],'result.pdf',{type:'application/pdf'}),password);return doc}
  async function archive(result,folder){for(var output of result.outputs)await save((output.blob.type.startsWith('image/')?'images/':'files/')+folder+'/'+output.name,output.blob)}

  await test('Create image, text PDF, scanned PDF and table fixtures',async function(){
    for(var [name,color] of [['red','#c83b36'],['blue','#315faa']]){
      var canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;
      var ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,240,160);ctx.fillStyle='#ffffff';ctx.font='24px sans-serif';ctx.fillText(name+' TEST',20,80);
      fixtures[name]=new File([await encode(canvas)],name+'.png',{type:'image/png'});await save('fixtures/'+name+'.png',fixtures[name]);
    }
    var doc=await PDFLib.PDFDocument.create(),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    for(var i=0;i<2;i++){
      var pg=doc.addPage(i===0?[300,400]:[400,300]);
      pg.drawText('Converter test page '+(i+1),{x:20,y:i===0?360:260,size:16,font:font});
      pg.drawText('Item',{x:20,y:220,size:12,font:font});pg.drawText('Amount',{x:180,y:220,size:12,font:font});
      pg.drawText('Example product',{x:20,y:195,size:12,font:font});pg.drawText('1,234',{x:180,y:195,size:12,font:font});
      pg.drawText('Code',{x:20,y:170,size:12,font:font});pg.drawText('0012',{x:180,y:170,size:12,font:font});
    }
    textPdf=new File([await doc.save()],'text.pdf',{type:'application/pdf'});await save('fixtures/text.pdf',textPdf);
    var image=await doc.embedPng(await fixtures.red.arrayBuffer()),scan=doc.addPage([300,400]);scan.drawImage(image,{x:0,y:100,width:300,height:200});
    fixtures.pdf=new File([await doc.save()],'mixed.pdf',{type:'application/pdf'});await save('fixtures/mixed.pdf',fixtures.pdf);
    var bad=new File(['broken'],'broken.pdf',{type:'application/pdf'});fixtures.badPdf=bad;
    check(TOOLS.length===11,'Expected 11 tools');check(new Set(TOOLS.map(t=>t.id)).size===11,'Duplicate tool ids');
  });

  await test('Page ranges, extracted text, paragraphs and invalid PDFs',async function(){
    check(JSON.stringify(parseRange('3-1,2',3))==='[1,2,3]','Range sort/dedup');check(parseRange('',3).length===3,'Default pages');
    for(var range of ['abc','9','0']){var rejected=false;try{parseRange(range,3)}catch{rejected=true}check(rejected,'Bad range accepted')}
    var doc=await openPdf(textPdf),pt=await pageText(await doc.getPage(1));check(pt.chars>20,'No text');check(toParas(pt).some(p=>p.text.includes('Converter test')),'Paragraph extraction');await doc.destroy();
    var rejected=false;try{await openPdf(fixtures.badPdf)}catch{rejected=true}check(rejected,'Corrupt PDF accepted');
  });

  await test('Image edge cases: one pixel, GIF, BMP, auto format, corrupt files and size validation',async function(){
    var tiny=document.createElement('canvas');tiny.width=1;tiny.height=1;tiny.getContext('2d').fillRect(0,0,1,1);
    var one=new File([await encode(tiny)],'one.png',{type:'image/png'});
    for(var fmt of ['auto','jpeg','png','webp']){
      var result=await run('img-compress',[one],{fmt:fmt,q:'low'});check(result.outputs.length===1,'One pixel output missing');var image=await createImageBitmap(result.outputs[0].blob);check(image.width===1&&image.height===1,'One pixel dimensions');image.close();await archive(result,'one-pixel-'+fmt);
    }
    var gif=new File([Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),c=>c.charCodeAt(0))],'one.gif',{type:'image/gif'});
    var bmpBytes=new Uint8Array(58),view=new DataView(bmpBytes.buffer);bmpBytes[0]=66;bmpBytes[1]=77;view.setUint32(2,58,true);view.setUint32(10,54,true);view.setUint32(14,40,true);view.setInt32(18,1,true);view.setInt32(22,1,true);view.setUint16(26,1,true);view.setUint16(28,24,true);view.setUint32(34,4,true);bmpBytes[54]=255;
    var bmp=new File([bmpBytes],'one.bmp',{type:'image/bmp'});
    for(var file of [gif,bmp]){var result=await run('img-convert',[file],{fmt:'jpeg',q:'medium'});check(result.outputs[0].blob.type==='image/jpeg','GIF/BMP conversion');await archive(result,'legacy-images/'+file.name)}
    var corrupt=new File(['not an image'],'broken.png',{type:'image/png'}),bad=await run('img-convert',[corrupt,fixtures.red],{fmt:'png'},{allowErrors:true});check(bad.errors.length===1&&bad.outputs.length===1,'Corrupt image batch recovery');
    for(var kb of ['',0,-1,4,20001,'abc'])check(!!BYID['img-compress'].validate({mode:'t',kb:kb}),'Invalid file-size target accepted: '+kb);
    check(!BYID['img-compress'].validate({mode:'t',kb:5}),'Valid minimum size rejected');
  });

  await test('Image to PDF: fit, A4 portrait, A4 landscape, multi-image order',async function(){
    for(var size of ['fit','a4p','a4l']){
      var result=await run('img-pdf',[fixtures.red,fixtures.blue],{size:size,margin:'28'});check(result.outputs.length===1,'Missing merged PDF');await archive(result,'image-pdf-'+size);
      var doc=await inspectPdf(result.outputs[0].blob);check(doc.numPages===2,'Page count');
      var page=await doc.getPage(1),vp=page.getViewport({scale:1});
      if(size==='fit')check(Math.abs(vp.width-180)<1&&Math.abs(vp.height-120)<1,'Fit dimensions');else check(size==='a4p'?vp.width<vp.height:vp.width>vp.height,'Orientation');
      var canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
      var center=canvas.getContext('2d').getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2)+15,1,1).data;check(center[0]>center[2],'Wrong image order');
      await save('images/pdf-previews/image-pdf-'+size+'.png',await encode(canvas));await doc.destroy();
    }
  });

  await test('PDF to JPG and PNG: each resolution, range selection, batch and bad files',async function(){
    for(var id of ['pdf-jpg','pdf-png']){
      check(!BYID[id].options.some(o=>o.id==='fmt'),'Formats not separated');
      for(var scale of ['1.5','2','3']){
        var result=await run(id,[fixtures.pdf],{range:'1,3',scale:scale});check(result.outputs.length===2,'Page range count');await archive(result,id+'-'+scale);
        for(var output of result.outputs){var image=await createImageBitmap(output.blob);check(image.width===300*Number(scale)&&image.height===400*Number(scale),'Raster dimensions');check(output.blob.type===(id==='pdf-jpg'?'image/jpeg':'image/png'),'Raster MIME');image.close()}
      }
      var batch=await run(id,[fixtures.badPdf,textPdf],{range:'1',scale:'1.5'},{allowErrors:true});check(batch.errors.length===1&&batch.outputs.length===1,'Batch did not recover after broken file');
      var badRange=await run(id,[textPdf],{range:'99'},{allowErrors:true});check(badRange.errors.length===1&&badRange.outputs.length===0,'Out-of-range pages accepted');
    }
  });

  await test('PDF to Word: text, scanned-page images, page breaks and ZIP/XML',async function(){
    var result=await run('pdf-docx',[fixtures.pdf]);await archive(result,'pdf-word');
    var zip=await JSZip.loadAsync(result.outputs[0].blob),body=await zip.file('word/document.xml').async('string');xml(body);
    check(body.includes('Converter test page 1'),'Word text missing');check(body.includes('w:type="page"'),'Word page breaks missing');
    check(Object.keys(zip.files).some(path=>path.startsWith('word/media/')&&!zip.files[path].dir),'Scanned image missing');
    xml(await zip.file('[Content_Types].xml').async('string'));xml(await zip.file('word/_rels/document.xml.rels').async('string'));
  });

  await test('PDF to PowerPoint: image/text modes and scanned-page fallback',async function(){
    for(var mode of ['img','txt']){
      var result=await run('pdf-pptx',[fixtures.pdf],{mode:mode,scale:'1.5'});await archive(result,'pdf-powerpoint-'+mode);
      var zip=await JSZip.loadAsync(result.outputs[0].blob),slides=Object.keys(zip.files).filter(path=>/^ppt\/slides\/slide\d+\.xml$/.test(path));check(slides.length===3,'Slide count');
      var slide1=await zip.file('ppt/slides/slide1.xml').async('string'),slide3=await zip.file('ppt/slides/slide3.xml').async('string');xml(slide1);xml(slide3);
      check(mode==='txt'?slide1.includes('Converter test page 1'):slide1.includes('<p:pic>'),'Wrong slide mode');check(slide3.includes('<p:pic>'),'Scanned slide fallback missing');
    }
  });

  await test('PDF to Excel: per-page/combined sheets, numbers, leading zeros and scans',async function(){
    for(var mode of ['each','one']){
      var result=await run('pdf-xlsx',[fixtures.pdf],{mode:mode});await archive(result,'pdf-excel-'+mode);
      var book=XLSX.read(await result.outputs[0].blob.arrayBuffer(),{type:'array'});check(book.SheetNames.length===(mode==='each'?3:1),'Sheet count');
      var cells=book.SheetNames.flatMap(name=>Object.entries(book.Sheets[name]).filter(([key])=>!key.startsWith('!')).map(([,cell])=>cell.v));
      check(cells.includes(1234),'Numeric value not converted');check(cells.includes('0012'),'Leading zeros lost');check(cells.some(v=>String(v).includes('ภาพสแกน')),'Scanned-page notice missing');
    }
  });

  await test('PDF protection: validation, encryption, passwords and permissions',async function(){
    var tool=BYID['pdf-protect'];check(!!tool.validate({pw1:'',pw2:''}),'Empty password');check(!!tool.validate({pw1:'abc',pw2:'abc'}),'Short password');check(!!tool.validate({pw1:'abcd',pw2:'xxxx'}),'Password mismatch');
    var result=await run('pdf-protect',[textPdf],{pw1:'test-pass',pw2:'test-pass',allowPrint:true,allowCopy:false,scale:'1.5'});await archive(result,'pdf-protected');
    protectedPdf=new File([result.outputs[0].blob],'protected.pdf',{type:'application/pdf'});
    for(var password of ['', 'wrong']){var rejected=false;try{await openPdf(protectedPdf,password)}catch{rejected=true}check(rejected,'Incorrect password opened PDF')}
    var doc=await openPdf(protectedPdf,'test-pass');check(doc.numPages===2,'Protected page count');var permissions=await doc.getPermissions();check(!permissions.includes(pdfjsLib.PermissionFlag.COPY),'Copy permission not restricted');check(permissions.includes(pdfjsLib.PermissionFlag.PRINT),'Print permission missing');await doc.destroy();
  });

  await test('PDF unlock: correct password, wrong password, reopen without password',async function(){
    var wrong=await run('pdf-unlock',[protectedPdf],{pw:'wrong'},{allowErrors:true});check(wrong.errors.length===1,'Wrong unlock password accepted');
    var result=await run('pdf-unlock',[protectedPdf],{pw:'test-pass',scale:'1.5'});await archive(result,'pdf-unlocked');
    var doc=await inspectPdf(result.outputs[0].blob);check(doc.numPages===2,'Unlocked page count');await doc.destroy();
  });

  await test('Translation internals with local stub: PDF/DOCX/TXT, rate limit and cancel',async function(){
    var result=await run('pdf-translate',[textPdf],{lang:'English',range:'1'});check(result.outputs.length===3,'Translation outputs missing');await archive(result,'translation-stub');
    var text=await result.outputs.find(o=>o.name.endsWith('.txt')).blob.text();check(text.includes('Translated:'),'Translated text missing');
    var zip=await JSZip.loadAsync(result.outputs.find(o=>o.name.endsWith('.docx')).blob);check((await zip.file('word/document.xml').async('string')).includes('Translated:'),'Translated Word missing');
    var doc=await inspectPdf(result.outputs.find(o=>o.name.endsWith('.pdf')).blob);check(doc.numPages>0,'Translated PDF empty');await doc.destroy();
    sampleMode='rate';var rejected=false;try{await run('pdf-translate',[textPdf])}catch{rejected=true}check(rejected,'Rate limit swallowed');sampleMode='ok';
    var ctl=new AbortController();ctl.abort();rejected=false;try{await run('pdf-translate',[textPdf],{}, {signal:ctl.signal})}catch(error){rejected=!!error.cancelled}check(rejected,'Translation cancellation swallowed');
  });

  await test('Core motion: reduced motion, rapid switch cancellation and fallback',async function(){
    var cancelled=0,calls=0;
    function target(){return {animate:function(){calls++;return {cancel:function(){cancelled++}}}}}
    var main=target();main.children=[target(),target(),Object.assign(target(),{hidden:true})];var button=target();
    var original=window.matchMedia;
    try{
      window.matchMedia=function(){return {matches:false}};animateToolChange(main,button);check(calls===3,'Motion target count');animateToolChange(main,button);check(cancelled===3,'Old motions not cancelled');
      window.matchMedia=function(){return {matches:true}};animateToolChange(main,button);check(calls===6&&cancelled===6,'Reduced motion ignored');
      window.matchMedia=function(){return {matches:false}};animateToolChange({children:[]},null);
    }finally{window.matchMedia=original}
  });

  await test('Real UI: navigation, files, options, conversion, downloads, ZIP and cancellation',async function(){
    var frame=document.createElement('iframe');frame.style.cssText='width:1200px;height:900px;border:0';frame.src='/';document.body.appendChild(frame);
    await waitFor(function(){return frame.contentDocument&&frame.contentDocument.querySelectorAll('.nb').length===11},'UI did not initialize',30000);
    var win=frame.contentWindow,doc=frame.contentDocument,downloaded=[],uiErrors=[];
    win.addEventListener('error',function(event){if(event.message)uiErrors.push(event.message)});win.addEventListener('unhandledrejection',function(event){uiErrors.push(String(event.reason))});
    var anchorClick=win.HTMLAnchorElement.prototype.click;
    win.HTMLAnchorElement.prototype.click=function(){if(this.download){downloaded.push({name:this.download,blob:fetch(this.href).then(r=>r.blob())});return}anchorClick.call(this)};
    function nav(id){doc.querySelector('.nb[data-id="'+id+'"]').click()}
    function set(id,value){var e=doc.getElementById('o_'+id);check(!!e,'Option missing: '+id);e.value=value;e.dispatchEvent(new win.Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))}
    function add(files,drop=false){var dt=new win.DataTransfer();files.forEach(file=>dt.items.add(file));if(drop)doc.getElementById('drop').dispatchEvent(new win.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));else{doc.getElementById('picker').files=dt.files;doc.getElementById('picker').dispatchEvent(new win.Event('change',{bubbles:true}))}}
    async function finish(){await waitFor(function(){return doc.getElementById('stop').hidden},'UI conversion stuck')}
    function rowNames(){return Array.from(doc.querySelectorAll('#flist .n')).map(e=>e.textContent)}
    for(var tool of TOOLS){nav(tool.id);check(doc.querySelector('.nb[aria-current="true"]').dataset.id===tool.id,'Wrong active nav');check(doc.getElementById('tTitle').textContent===tool.title,'Wrong heading')}
    nav('pdf-translate');check(doc.getElementById('run').disabled,'Translation enabled outside Claude');
    nav('img-convert');doc.getElementById('run').click();check(doc.getElementById('resCard').hidden,'No-files conversion ran');
    add([new File(['x'],'wrong.txt',{type:'text/plain'}),fixtures.red]);check(rowNames().length===1,'File filter');
    nav('img-convert');check(rowNames().length===1,'Same menu cleared files');
    set('fmt','webp');var low=doc.querySelector('input[name="o_q_level"][value="low"]');low.checked=true;low.dispatchEvent(new win.Event('change',{bubbles:true}));check(doc.getElementById('o_q').value==='low','Quality radio state');
    doc.getElementById('run').click();check(doc.getElementById('clear').disabled,'Controls active while converting');nav('pdf-jpg');check(doc.getElementById('tTitle').textContent===BYID['img-convert'].title,'Navigation changed while busy');await finish();
    check(doc.querySelectorAll('#rl .ri').length===1,'UI result missing');check(!doc.getElementById('resErr').textContent,'UI conversion error');
    doc.querySelector('#rl .btn').click();await waitFor(function(){return downloaded.length===1},'Single download missing');var single=await downloaded[0].blob;check(single.type==='image/webp','Downloaded MIME');await save('images/ui/single.webp',single);
    doc.getElementById('clear').click();check(rowNames().length===0&&doc.getElementById('resCard').hidden,'Clear failed');
    var duplicate=new File([fixtures.red],'same.png',{type:'image/png'}),collision=new File([fixtures.blue],'same-1.png',{type:'image/png'});
    add([duplicate,duplicate,collision],true);check(rowNames().length===3,'Drop did not add files');doc.getElementById('run').click();await finish();
    doc.querySelector('#ftr .btn').click();await waitFor(function(){return downloaded.length===2},'ZIP download missing');var zipBlob=await downloaded[1].blob,zip=await JSZip.loadAsync(zipBlob);check(Object.keys(zip.files).length===3,'Duplicate ZIP filenames overwrote a file');await save('files/ui/results.zip',zipBlob);
    nav('img-pdf');add([fixtures.red,fixtures.blue]);doc.querySelectorAll('#flist .fi')[1].querySelector('button').click();check(rowNames()[0]==='blue.png','Reorder failed');
    nav('img-convert');check(doc.getElementById('o_fmt').value==='webp','Saved option lost');
    add([fixtures.red,fixtures.blue]);doc.getElementById('run').click();doc.getElementById('stop').click();await finish();check(!doc.getElementById('clear').disabled,'Cancel left controls locked');
    nav('pdf-protect');add([textPdf]);set('pw1','test');set('pw2','wrong');doc.getElementById('run').click();check(doc.getElementById('stop').hidden,'Invalid passwords started conversion');
    nav('pdf-jpg');add([fixtures.badPdf,textPdf]);set('range','1');set('scale','1.5');doc.getElementById('run').click();await finish();check(doc.querySelectorAll('#rl .ri').length===1&&doc.querySelectorAll('#resErr .err').length===1,'UI partial failure missing');
    nav('img-compress');check(!doc.getElementById('o_side'),'Removed pixel option still present');set('mode','t');check(doc.querySelector('[data-opt="q"]').hidden&&!doc.querySelector('[data-opt="kb"]').hidden,'Conditional options');
    add([fixtures.red]);set('kb','-1');doc.getElementById('run').click();check(doc.getElementById('stop').hidden,'UI accepted negative size target');
    nav('img-convert');var suspicious=new File([fixtures.red],'<img src=x onerror=alert(1)>.png',{type:'image/png'});add([suspicious]);check(!doc.querySelector('#flist img'),'Filename interpreted as HTML');check(doc.querySelector('#flist .n').textContent===suspicious.name,'Filename not preserved');
    frame.style.width='390px';await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));check(win.getComputedStyle(doc.querySelector('.shell')).gridTemplateColumns.split(' ').length===1,'Mobile grid');check(doc.documentElement.scrollWidth<=win.innerWidth+1,'Mobile horizontal overflow');
    frame.style.width='1200px';await new Promise(resolve=>win.requestAnimationFrame(()=>win.requestAnimationFrame(resolve)));var rect=doc.querySelector('.wrap').getBoundingClientRect();check(Math.abs(rect.left-(win.innerWidth-rect.width)/2)<2,'Desktop horizontal centering');
    check(uiErrors.length===0,'Uncaught UI errors: '+uiErrors.join('; '));report.uiErrors=uiErrors;win.HTMLAnchorElement.prototype.click=anchorClick;
  });
  check(runtimeErrors.length===0,'Uncaught browser errors: '+runtimeErrors.join('; '));report.passed=true;
}catch(error){report.passed=false;report.error=error.stack||error.message}
report.runtimeErrors=runtimeErrors;
document.querySelector('p').textContent=report.passed?'PASS':'FAIL: '+report.error;
await fetch('/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
