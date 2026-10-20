import { imageOutput, QUALITY_PRESETS } from '/assets/js/helpers/image-quality.js';
import { loadImage } from '/assets/js/helpers/images.js';
import { createQualityPicker } from '/assets/js/core/quality-picker.js';
import { fmtB } from '/assets/js/core/utils.js';
import convert from '/assets/js/tools/img-convert.js';
import compress from '/assets/js/tools/img-compress.js';

var report={browser:navigator.userAgent,checks:0,outputs:[]};
function check(condition,message){if(!condition)throw new Error(message);report.checks++}
function blob(canvas,type,quality){return new Promise(function(resolve){canvas.toBlob(resolve,type,quality)})}
async function save(path,value){var response=await fetch('/artifact?path='+encodeURIComponent(path),{method:'POST',body:value});check(response.ok,'Could not save '+path)}
async function waitFor(condition){
  var deadline=Date.now()+15000;
  while(!condition()){
    if(Date.now()>deadline)throw new Error('Preview did not finish');
    await new Promise(function(resolve){setTimeout(resolve,25)});
  }
}

try{
  var canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
  var context=canvas.getContext('2d'),pixels=context.createImageData(320,240),seed=42;
  for(var i=0;i<pixels.data.length;i+=4){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    pixels.data[i]=seed&255;pixels.data[i+1]=(i/4)%256;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  var png=new File([await blob(canvas,'image/png')],'detail.png',{type:'image/png'});
  var jpg=new File([await blob(canvas,'image/jpeg',0.82)],'detail.jpg',{type:'image/jpeg'});
  context.clearRect(0,0,320,240);context.fillStyle='rgba(40,120,210,0.5)';context.fillRect(10,10,120,100);
  var alpha=new File([await blob(canvas,'image/png')],'transparent.png',{type:'image/png'});
  var fixtures=[png,jpg,alpha];
  var large=document.createElement('canvas');large.width=1920;large.height=1080;
  var largeContext=large.getContext('2d'),pixelsLarge=largeContext.createImageData(1920,1080),state=123;
  for(var i=0;i<pixelsLarge.data.length;i+=4){state=(Math.imul(state,1664525)+1013904223)>>>0;pixelsLarge.data[i]=state&255;pixelsLarge.data[i+1]=(state>>>8)&255;pixelsLarge.data[i+2]=(state>>>16)&255;pixelsLarge.data[i+3]=255}
  largeContext.putImageData(pixelsLarge,0,0);
  var largeFile=new File([await blob(large,'image/png')],'large-1920x1080.png',{type:'image/png'});check(largeFile.size>1048576,'Large fixture must exercise MiB sizes');fixtures.push(largeFile);
  var webp=new File([await blob(canvas,'image/webp',0.9)],'transparent.webp',{type:'image/webp'});check(webp.type==='image/webp','WebP fixture type');fixtures.push(webp);
  for(var fixture of fixtures)await save('fixtures/'+fixture.name,fixture);
  for(var file of fixtures){
    for(var tool of [convert,compress]){
      for(var format of ['jpeg','webp','png']){
        var pngSizes=[];
        for(var preset of QUALITY_PRESETS){
          var values={fmt:format,q:preset.id,mode:'q'},src=await loadImage(file);
          var output;
          try{output=await imageOutput(src,file,values,tool===compress)}finally{src.close()}
          var actual=[];
          await tool.run({files:[file],v:values,chk:function(){},set:function(){},add:function(result){actual.push(result)},fail:function(name,error){throw error}});
          check(actual.length===1,'Missing output');
          check(output.blob.size===actual[0].blob.size,'Preview and output byte counts differ');
          check(output.blob.size===(await output.blob.arrayBuffer()).byteLength,'Blob.size differs from encoded bytes');
          check(output.blob.type===(format==='jpeg'?'image/jpeg':'image/'+format),'Wrong MIME type');
          var decoded=await createImageBitmap(actual[0].blob);
          var scale=tool===compress&&format==='png'?preset.pngScale:1;
          var width=file===largeFile?1920:320,height=file===largeFile?1080:240;
          check(decoded.width===Math.round(width*scale)&&decoded.height===Math.round(height*scale),'Incorrect image dimensions');
          if(format==='jpeg'&&file===alpha){
            var sample=document.createElement('canvas');sample.width=1;sample.height=1;
            var ctx=sample.getContext('2d');ctx.drawImage(decoded,0,0);
            var rgba=ctx.getImageData(0,0,1,1).data;
            check(rgba[0]>245&&rgba[1]>245&&rgba[2]>245,'JPEG background is not white');
          }
          decoded.close();
          await save('images/'+tool.id+'/'+file.name+'/'+preset.id+'.'+(format==='jpeg'?'jpg':format),actual[0].blob);
          if(format==='png')pngSizes.push(output.blob.size);
          report.outputs.push({fixture:file.name,originalBytes:file.size,tool:tool.id,format:format,level:preset.id,bytes:output.blob.size});
        }
        if(tool===convert&&format==='png')check(new Set(pngSizes).size===1,'PNG conversion changed with quality');
      }
    }
  }

  var picker=createQualityPicker('verification_quality','high');document.body.append(picker.element,picker.input);
  picker.update([png,jpg],{fmt:'jpeg',mode:'q'},compress);
  var labels=picker.element.querySelectorAll('.quality-size');
  await waitFor(function(){return labels[0].title.endsWith(' bytes')});
  QUALITY_PRESETS.forEach(function(preset,index){
    var total=report.outputs.filter(function(row){return ['detail.png','detail.jpg'].includes(row.fixture)&&row.tool==='img-compress'&&row.format==='jpeg'&&row.level===preset.id}).reduce(function(sum,row){return sum+row.bytes},0);
    check(labels[index].title===total+' bytes','UI batch total is incorrect');
    check(labels[index].textContent.endsWith(fmtB(total)),'UI unit formatting is incorrect');
  });
  picker.update([alpha],{fmt:'jpeg',mode:'q'},convert);
  picker.update([png],{fmt:'png',mode:'q'},convert);
  await waitFor(function(){return labels[0].title.endsWith(' bytes')});
  var pngRow=report.outputs.find(function(row){return row.fixture==='detail.png'&&row.tool==='img-convert'&&row.format==='png'});
  check(Array.from(labels).every(function(label){return label.title===pngRow.bytes+' bytes'}),'Stale preview or incorrect PNG byte count');
  picker.dispose();

  for(var format of ['jpeg','webp','png']){
    var source=await loadImage(png),limited;
    try{limited=await imageOutput(source,png,{fmt:format,mode:'t',kb:5},true)}finally{source.close()}
    check(limited.hit===(limited.blob.size<=5120),'Size target hit flag is incorrect');
    await save('images/size-target/'+format+'.'+(format==='jpeg'?'jpg':format),limited.blob);
    report.outputs.push({fixture:png.name,tool:'size-target',format:format,targetBytes:5120,bytes:limited.blob.size,hit:limited.hit});
  }
  var jpegRow=report.outputs.find(function(row){return row.fixture==='detail.png'&&row.tool==='img-compress'&&row.format==='jpeg'&&row.level==='high'});
  for(var delta of [0,1,-1]){
    var sized=new File([new Uint8Array(jpegRow.bytes+delta)],'sized.png',{type:'image/png'});
    var result=[];
    var nativeDecode=window.createImageBitmap;
    window.createImageBitmap=function(source){return nativeDecode.call(window,source===sized?png:source)};
    try{await compress.run({files:[sized],v:{fmt:'jpeg',q:'high',mode:'q'},chk:function(){},set:function(){},add:function(item){result.push(item)},fail:function(name,error){throw error}})}
    finally{window.createImageBitmap=nativeDecode}
    check(result.length===1,'Compression comparison failed');
    check((result[0].cls==='g')===(delta>0),'Incorrect reduction status near zero percent');
    report.comparisonNotes=report.comparisonNotes||[];report.comparisonNotes.push({delta:delta,note:result[0].note});
  }
  check(fmtB(1024)==='1.0 KiB','Incorrect KiB unit');
  check(fmtB(1048576)==='1.00 MiB','Incorrect MiB unit');
  report.passed=true;
}catch(error){report.passed=false;report.error=error.stack||error.message}
document.body.textContent=JSON.stringify(report);
await fetch('/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
