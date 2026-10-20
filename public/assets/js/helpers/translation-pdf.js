import { need, toBlob, mkCanvas, freeCanvas } from './../core/utils.js';

/* ---------- translation PDF (drawn text, any script) ---------- */
async function textToPdf(pages,set,chk){
  var P=need('PDFLib');
  try{await document.fonts.load('400 24px "IBM Plex Sans Thai"')}catch(e){}
  var W=1190,H=1684,M=112,fs=24,lh=Math.round(fs*1.65);
  var font=fs+'px "IBM Plex Sans Thai","Noto Sans Thai","Noto Sans CJK SC","Noto Sans JP","Noto Sans KR","Malgun Gothic","Yu Gothic","Microsoft YaHei",sans-serif';
  var seg=(typeof Intl!=='undefined'&&Intl.Segmenter)?new Intl.Segmenter(undefined,{granularity:'word'}):null;
  var doc=await P.PDFDocument.create(),c=null,x=null,y=0;
  async function flush(){
    if(!c)return;
    var b=await toBlob(c,'image/jpeg',0.9),img=await doc.embedJpg(await b.arrayBuffer());
    var pg=doc.addPage([595.28,841.89]);pg.drawImage(img,{x:0,y:0,width:595.28,height:841.89});
    freeCanvas(c);c=null;
  }
  function fresh(){c=mkCanvas(W,H);x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.fillStyle='#111';x.font=font;x.textBaseline='top';y=M}
  function wrap(text){
    var toks=seg?Array.from(seg.segment(text),function(s){return s.segment}):text.split(/(\s+)/),lines=[],line='',maxW=W-2*M;
    toks.forEach(function(t){
      if(x.measureText(line+t).width<=maxW){line+=t;return}
      if(line.trim())lines.push(line.replace(/\s+$/,''));
      line=t.replace(/^\s+/,'');
      while(x.measureText(line).width>maxW){
        var k=line.length;while(k>1&&x.measureText(line.slice(0,k)).width>maxW)k--;
        lines.push(line.slice(0,k));line=line.slice(k);
      }
    });
    if(line.trim())lines.push(line);
    return lines;
  }
  for(var p=0;p<pages.length;p++){
    chk();
    if(c&&p>0)await flush();
    if(!c)fresh();
    for(var k=0;k<pages[p].length;k++){
      var ls=wrap(pages[p][k]);
      for(var j=0;j<ls.length;j++){
        if(y+lh>H-M){await flush();fresh()}
        x.fillText(ls[j],M,y);y+=lh;
      }
      y+=Math.round(lh*0.55);
    }
    set(0.9+0.08*((p+1)/pages.length),'สร้างไฟล์ PDF หน้า '+(p+1));
  }
  await flush();
  return new Blob([await doc.save()],{type:'application/pdf'});
}

export { textToPdf };
