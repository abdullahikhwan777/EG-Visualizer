
(function(){
  'use strict';
  var overlay=document.getElementById('trace-splash');
  if(!overlay)return;
  var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){overlay.remove();return;}
  // The reveal runs only on initial page entry, never between question changes.
  window.setTimeout(function(){if(overlay.isConnected)overlay.remove()},2490);
})();
