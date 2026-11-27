
(function(){'use strict';
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,root=document.getElementById('root');
if(!root||reduce)return;
var base=document.documentElement.classList.contains('tm-seen')?.05:1.32;
var G=['.sidebar .brand','.sidebar-divider','.sidebar-section-label','.sidebar .module','.sidebar-questions-heading','.questions-nav .question','.sidebar-bottom','.header .eyebrow','.header h1','.header-description','.header .status','.question-card','.canvas-header','.guide-card','.developer-footer'].join(',');
var seq=0,io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.style.setProperty('--d','0s');e.target.setAttribute('data-tm','1');io.unobserve(e.target)}})},{threshold:.12});
var first=true,t0=performance.now();
function tag(){
 var late=performance.now()-t0>3500;
 root.querySelectorAll(G).forEach(function(el){
  if(el.hasAttribute('data-tm')||el.closest('.drawing-container,.eg-viewer'))return;
  var below=el.getBoundingClientRect().top>innerHeight*.95,sc=el.matches('.question-card,.canvas-header,.guide-card,.developer-footer');
  el.setAttribute('data-tm','0');
  if(sc&&below){io.observe(el);return}
  var d=(late?0:base)+Math.min(seq++,22)*.05;
  el.style.setProperty('--d',d+'s');
  requestAnimationFrame(function(){requestAnimationFrame(function(){el.setAttribute('data-tm','1')})});
 });
}
var raf=0,mo=new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;seq=late()?0:seq;tag();watch()})});
function late(){return performance.now()-t0>3500}
mo.observe(root,{childList:true,subtree:true,characterData:true});
tag();
setTimeout(function(){document.querySelectorAll('[data-tm="0"]').forEach(function(e){if(!e.closest('[data-io]'))e.setAttribute('data-tm','1')})},5000);
/* question + step swaps */
var sigQ='',sigS='',dir='fwd';
function swap(el,v){if(!el)return;el.removeAttribute('data-swap');void el.offsetWidth;el.setAttribute('data-swap',v)}
function watch(){
 var q=(root.querySelector('.question-text')||{}).textContent||'',s=(root.querySelector('.guide-content')||{}).textContent||'';
 if(sigQ&&q&&q!==sigQ){root.querySelectorAll('.header h1,.header-description,.question-text').forEach(function(e){swap(e,'1')});swap(root.querySelector('.guide-content'),'1');sigS=s;dir='fwd'}
 else if(sigS&&s&&s!==sigS){swap(root.querySelector('.guide-content'),dir)}
 if(q)sigQ=q;if(s)sigS=s;
}
setTimeout(watch,600);
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.control-button,button[data-eg-icon]');if(!b)return;
 var ic=(b.getAttribute('data-eg-icon')||'')+' '+(b.getAttribute('aria-label')||'')+' '+b.textContent;
 dir=/prev|back/i.test(ic)?'back':'fwd'},true);
/* damped cursor ring */
if(matchMedia('(hover:hover) and (pointer:fine)').matches){
 var r=document.createElement('div');r.id='tm-ring';r.setAttribute('aria-hidden','true');document.body.appendChild(r);
 var x=0,y=0,tx=0,ty=0,s=1,ts=1,lt=performance.now(),run=false;
 addEventListener('mousemove',function(e){tx=e.clientX;ty=e.clientY;if(!run){x=tx;y=ty;run=true;r.classList.add('on');requestAnimationFrame(tick)}
  var t=e.target,hit=t.closest&&t.closest('.drawing-container,.eg-viewer,svg');r.classList.toggle('off',!!hit);
  var a=t.closest&&t.closest('button,a,.module,.question,select,input');r.classList.toggle('act',!!a);ts=a?1.7:1},{passive:true});
 document.addEventListener('mouseleave',function(){r.classList.remove('on')});
 function tick(n){var dt=Math.min((n-lt)/1000,.05);lt=n;var k=1-Math.exp(-14*dt),k2=1-Math.exp(-10*dt);
  x+=(tx-x)*k;y+=(ty-y)*k;s+=(ts-s)*k2;r.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+s+')';requestAnimationFrame(tick)}
}
})();
