
(function(){
  'use strict';
  const ua=navigator.userAgent || '';
  const ios=/iPad|iPhone|iPod/i.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  const mobile=ios || android || (matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 950px)').matches);
  const windows=/Windows/i.test(ua) && !mobile;
  const edge=/Edg\//i.test(ua);
  const chrome=/Chrome\//i.test(ua) && !edge;
  const safari=/Safari\//i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
  const mode=matchMedia('(display-mode: standalone)');
  const installedMode=()=>mode.matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone===true;
  const root=document.getElementById('root');
  const help=document.getElementById('trace-install-help');
  let installedThisVisit=false;
  const buttonIDs=['trace-install-login','trace-install-account','trace-install-topbar'];
  function update(){
    const topbar=root.querySelector('.mobile-topbar');
    if(mobile && topbar && !document.getElementById('trace-install-topbar')){
      const button=document.createElement('button');
      button.id='trace-install-topbar';button.type='button';button.className='trace-install-button';
      button.hidden=true;button.title='Add Trace to Home Screen';button.setAttribute('aria-label','Add Trace to Home Screen');
      button.innerHTML=ICON;
      topbar.appendChild(button);
    }
    const hidden=installedMode() || installedThisVisit;
    const label=mobile?'Add Trace to Home Screen':'Install Trace on Desktop';
    for(const id of buttonIDs){
      const button=document.getElementById(id);if(!button)continue;
      button.hidden=hidden;
      const text=button.querySelector('span');
      if(text && text.textContent!==label)text.textContent=label;
      button.title=label;button.setAttribute('aria-label',label);
      const svg=button.querySelector('svg');
      if(svg && !mobile && svg.dataset.desktop!=='true'){
        svg.innerHTML='<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5m0-15v6m-3-3 3 3 3-3"/>';
        svg.dataset.desktop='true';
      }
    }
  }
  function showHelp(){
    let steps;
    document.getElementById('trace-install-intro').textContent=mobile?"Add Trace to your phone's home screen.":'Open Trace directly from your computer, like an app.';
    document.getElementById('trace-install-download').hidden=!windows;
    if(windows)document.getElementById('trace-install-intro').textContent+=' Alternatively, download the Windows link and move it from Downloads to Desktop; it opens Trace in your default browser.';
    if(ios)steps=['Open Trace in Safari if you are using an in-app browser.','Tap the Share button.','Choose Add to Home Screen. Enable Open as Web App if offered, then tap Add.'];
    else if(mobile)steps=['Open Trace in Chrome or Samsung Internet, not inside another app.','Open the browser menu (three dots or menu icon).','Choose Install app or Add to Home screen and confirm.'];
    else if(edge)steps=['Open the Edge menu (three dots).','Choose More tools > Apps > Install this site as an app.','Confirm installation. To add a desktop shortcut, open edge://apps, select Details for Trace and choose Create Desktop shortcut.'];
    else if(chrome)steps=['Open the Chrome menu (three dots).','Choose Cast, save, and share > Install page as app. Confirm installation.','If you need a desktop icon, open chrome://apps, right-click Trace and choose Create shortcut, then select Desktop.'];
    else if(safari)steps=['On macOS Sonoma or later, choose File > Add to Dock in Safari.','Confirm Add. Trace will be available in the Dock.','If this option is unavailable, use Chrome or Edge to install Trace.'];
    else steps=['Open Trace in desktop Chrome or Microsoft Edge.','Use the browser menu to install the page as an app.','Follow the browser instructions to create a desktop shortcut.'];
    const list=document.getElementById('trace-install-steps');list.replaceChildren(...steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    if(!help.open)help.showModal();
  }
  let busy=false;
  async function install(){
    if(busy || installedMode() || installedThisVisit)return;
    const prompt=window.traceInstallPrompt;
    if(!prompt){showHelp();return;}
    busy=true;window.traceInstallPrompt=null;
    try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')installedThisVisit=true;}
    catch(_){showHelp();}
    finally{busy=false;update();}
  }
  document.addEventListener('click',event=>{if(event.target.closest('.trace-install-button'))install();});
  document.getElementById('trace-install-close').addEventListener('click',()=>help.close());
  document.getElementById('trace-install-download').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob(['[InternetShortcut]\r\nURL=https://abdullahikhwan777.github.io/EG-Visualizer/\r\n'],{type:'application/octet-stream'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='Trace.url';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener('trace-install-available',()=>{installedThisVisit=false;update();});
  window.addEventListener('appinstalled',()=>{installedThisVisit=true;window.traceInstallPrompt=null;if(help.open)help.close();update();});
  if(mode.addEventListener)mode.addEventListener('change',update);
  const ICON="<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"3\"/><path d=\"M12 7v7m-3-3 3 3 3-3M11 18h2\"/></svg>";
  new MutationObserver(update).observe(root,{childList:true,subtree:true});update();
})();
