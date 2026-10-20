import { freeCanvas } from '../core/utils.js';
import { dims, drawImg, encode, pickType, compressOne } from './images.js';

export var QUALITY_PRESETS=[
  {id:'high',label:'สูง',quality:0.92,pngScale:1},
  {id:'medium',label:'กลาง',quality:0.75,pngScale:0.8},
  {id:'low',label:'ต่ำ',quality:0.45,pngScale:0.6}
];

export async function imageOutput(src,file,values,compress){
  var preset=QUALITY_PRESETS.find(function(p){return p.id===values.q})||QUALITY_PRESETS[0];
  var type=pickType(file,values.fmt);
  if(compress){
    var target=values.mode==='t'?(+values.kb||300):0;
    var side=0;
    if(type==='image/png'&&!target){
      var longest=Math.max.apply(null,dims(src));
      side=Math.max(1,Math.round(longest*preset.pngScale));
    }
    return compressOne(src,{type:type,q:preset.quality,maxSide:side,targetKB:target});
  }
  var canvas=drawImg(src,1,type==='image/jpeg');
  try{return {blob:await encode(canvas,type,preset.quality),hit:true}}
  finally{freeCanvas(canvas)}
}
