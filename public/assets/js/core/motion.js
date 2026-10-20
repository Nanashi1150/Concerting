var animations=[];

export function animateToolChange(main,button){
  animations.forEach(function(animation){animation.cancel()});
  animations=[];
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(typeof main.animate!=='function')return;
  Array.prototype.forEach.call(main.children,function(section,index){
    if(section.hidden)return;
    animations.push(section.animate([
      {opacity:0,transform:'translateY(12px)'},
      {opacity:1,transform:'translateY(0)'}
    ],{duration:300,delay:index*45,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'backwards'}));
  });
  if(button&&typeof button.animate==='function'){
    animations.push(button.animate([
      {scale:'1'},
      {scale:'0.97',offset:0.35},
      {scale:'1'}
    ],{duration:220,easing:'ease-out'}));
  }
}
