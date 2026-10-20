var $=function(s){return document.querySelector(s)};
var fmtB=function(n){return n<1024?n+' B':n<1048576?(n/1024).toFixed(n<10240?1:0)+' KiB':(n/1048576).toFixed(2)+' MiB'};
var baseName=function(n){return n.replace(/\.[^.\/\\]+$/,'')};
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
var toastT;
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on')},2800)}
function need(n){if(!window[n])throw new Error('โหลดส่วนประกอบของเครื่องมือไม่สำเร็จ ลองรีเฟรชหน้านี้');return window[n]}
function toBlob(c,t,q){return new Promise(function(res,rej){c.toBlob(function(b){b?res(b):rej(new Error('สร้างไฟล์ภาพไม่สำเร็จ'))},t,q)})}
function mkCanvas(w,h){var c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}
function freeCanvas(c){c.width=0;c.height=0}

export { $, fmtB, baseName, sleep, toast, need, toBlob, mkCanvas, freeCanvas };
