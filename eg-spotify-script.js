
(function () {
  'use strict';
  const DEFAULT_ID = '37i9dQZF1DWZeKCadgRdKQ';
  const DEFAULT_LINK = `https://open.spotify.com/playlist/${DEFAULT_ID}`;
  const STORAGE_KEY = 'eg-visualizer-spotify-link-v1';
  const VALID_TYPES = new Set(['playlist','album','track','artist','show','episode']);
  let widget, button, viewer, api, controller, currentInfo, viewerClassObserver;
  let raf=0, generation=0, wasFullscreen=false, ready=false, mounting=false, fallback=false;
  let pendingPlay=false, playing=false, attemptedOnClick=false, playbackTimer=0, mountTimer=0, toastTimer=0, entryTimer=0;
  function fullscreenAvailable() {
    return Boolean(viewer && (document.fullscreenElement === viewer || document.webkitFullscreenElement === viewer || viewer.classList.contains('eg-viewer-pseudo-fullscreen')));
  }
  function host() { return widget.querySelector('.trace-spotify-host'); }
  function status(message) { if (widget) widget.querySelector('.eg-spotify-status').textContent=message; }
  function stopTimers() { clearTimeout(playbackTimer); clearTimeout(entryTimer); }
  function disposePlayer() {
    generation++; clearTimeout(mountTimer); stopTimers(); ready=false; mounting=false; fallback=false; playing=false;
    if (controller) { try { controller.pause(); controller.destroy(); } catch (_) {} }
    controller=null; if(widget) host().replaceChildren();
  }
  function manualFallback() {
    if (!widget || !currentInfo) return;
    disposePlayer(); fallback=true;
    const frame=document.createElement('iframe'); frame.className='eg-spotify-embed'; frame.title='Spotify Study Music Player';
    frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'; frame.allowFullscreen=true;
    frame.src=currentInfo.embed; host().appendChild(frame);
    if(fullscreenAvailable()) { pendingPlay=false; setOpen(true); status('Press Play in Spotify to start your music.'); }
  }
  function mountPlayer() {
    if (!widget || !currentInfo || controller || mounting || fallback) return;
    if (!api) return;
    mounting=true; const token=++generation;
    const slot=document.createElement('div'); host().replaceChildren(slot);
    mountTimer=setTimeout(()=>{if(token===generation && !ready) manualFallback();},8000);
    try {
      api.createController(slot,{width:'100%',height:242,uri:currentInfo.uri},c=>{
        if(token!==generation) {try{c.destroy();}catch(_){} return;}
        controller=c; mounting=false;
        const frame=host().querySelector('iframe');
        if(frame){frame.classList.add('eg-spotify-embed'); frame.title='Spotify Study Music Player';}
        c.addListener('ready',()=>{
          if(token!==generation)return;
          ready=true; clearTimeout(mountTimer);
          if(pendingPlay && fullscreenAvailable()) requestPlay();
        });
        c.addListener('playback_started',()=>{
          if(token!==generation)return;
          if(!fullscreenAvailable() && !attemptedOnClick){try{c.pause();}catch(_){} return;}
          playing=true; pendingPlay=false; clearTimeout(playbackTimer); status('');
        });
        c.addListener('playback_update',event=>{
          if(token!==generation || !event.data)return;
          if(event.data.isPaused===false && !event.data.isBuffering){
            if(!fullscreenAvailable() && !attemptedOnClick){try{c.pause();}catch(_){} return;}
            playing=true; pendingPlay=false; clearTimeout(playbackTimer); status('');
          } else if(event.data.isPaused===true) playing=false;
        });
      });
    } catch (_) { manualFallback(); }
  }
  window.onSpotifyIframeApiReady = value=>{api=value; mountPlayer();};
  function requestPlay() {
    if(!fullscreenAvailable() && !attemptedOnClick)return;
    pendingPlay=true;
    if(ready && controller){
      try{controller.play();}catch(_){if(fullscreenAvailable()) {setOpen(true);status('Press Play in Spotify to start your music.');}}
    }
    clearTimeout(playbackTimer);
    playbackTimer=setTimeout(()=>{
      if(!fullscreenAvailable() || playing || !pendingPlay)return;
      if(!ready && !fallback){manualFallback();return;}
      pendingPlay=false; setOpen(true); status('Press Play in Spotify to start your music.');
    },3500);
  }
  function showMusicHint() {
    let hint=viewer.querySelector('.trace-music-hint');
    if(!hint){hint=document.createElement('div');hint.className='trace-music-hint';hint.setAttribute('role','status');viewer.appendChild(hint);}
    hint.textContent='You can play your own playlist';hint.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{hint.hidden=true;},2000);
  }
  function syncFullscreenAvailability() {
    if(!button || !widget)return;
    const allowed=fullscreenAvailable();
    button.disabled=!allowed;button.setAttribute('aria-hidden',String(!allowed));button.tabIndex=allowed?0:-1;
    if(allowed && !wasFullscreen){
      wasFullscreen=true; clearTimeout(entryTimer); showMusicHint();
      if(fallback){setOpen(true);status('Press Play in Spotify to start your music.');}
      else if(!playing){if(!attemptedOnClick || !ready)requestPlay();}
      attemptedOnClick=false;
    } else if(!allowed && wasFullscreen){
      wasFullscreen=false;attemptedOnClick=false;pendingPlay=false;playing=false;stopTimers();setOpen(false);status('');
      if(controller){try{controller.pause();}catch(_){} }
      if(fallback){disposePlayer();mountPlayer();}
      const hint=viewer.querySelector('.trace-music-hint');if(hint)hint.hidden=true;
    }
  }
  function readSavedLink() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (_) { return ''; }
  }
  function saveLink(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (_) { /* storage optional */ }
  }
  function parseSpotifyLink(value) {
    const raw = String(value || '').trim();
    let type, id;
    const uri = raw.match(/^spotify:(playlist|album|track|artist|show|episode):([a-zA-Z0-9]{15,40})$/i);
    if (uri) {
      type = uri[1].toLowerCase(); id = uri[2];
    } else {
      let url;
      try { url = new URL(raw); } catch (_) { return null; }
      if (url.protocol !== 'https:' || !['open.spotify.com','www.open.spotify.com'].includes(url.hostname)) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (/^intl-[a-z]{2}$/i.test(parts[0] || '')) parts.shift();
      if (parts[0] === 'embed') parts.shift();
      type = (parts[0] || '').toLowerCase();
      id = parts[1] || '';
    }
    if (!VALID_TYPES.has(type) || !/^[a-zA-Z0-9]{15,40}$/.test(id)) return null;
    return {
      uri: `spotify:${type}:${id}`,
      link: `https://open.spotify.com/${type}/${id}`,
      embed: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
    };
  }
  function setSpotifyLink(raw, reportErrors) {
    const info=parseSpotifyLink(raw);
    if(!info){if(reportErrors)status('Paste a valid Spotify playlist, album, track or podcast link.');return false;}
    const changed=!currentInfo || currentInfo.uri!==info.uri;
    currentInfo=info;status('');
    widget.querySelector('.eg-spotify-open').href=info.link;
    widget.querySelector('.eg-spotify-input').value=info.link;saveLink(info.link);
    if(changed){disposePlayer();pendingPlay=fullscreenAvailable();mountPlayer();}
    if(reportErrors && fullscreenAvailable()){
      if(!api){manualFallback();}else{requestPlay();}
    }
    return true;
  }
  function setOpen(open) {
    if(!widget || !button || (open && !fullscreenAvailable()))return;
    widget.dataset.open=String(open);widget.setAttribute('aria-hidden',String(!open));button.setAttribute('aria-expanded',String(open));
    if(open && !controller && !mounting && !fallback){if(api)mountPlayer();else manualFallback();}
  }
  function createWidget() {
    const panel = document.createElement('section');
    panel.className = 'eg-spotify-panel';
    panel.id = 'eg-spotify-panel';
    panel.dataset.open = 'false';
    panel.setAttribute('aria-label', 'Spotify Study Music');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="eg-spotify-heading">
        <div><span>TRACE · STUDY MODE</span><br><strong>Study Music</strong></div>
        <button class="eg-spotify-close" type="button" aria-label="Close music panel">×</button>
      </div>
      <p class="eg-spotify-subtitle">Play your own playlist while studying. If autoplay is blocked, press Play in Spotify below.</p>
      <div class="trace-spotify-host"></div>
      <form class="eg-spotify-form" autocomplete="off">
        <input class="eg-spotify-input" type="url" inputmode="url" aria-label="Spotify playlist or track link"
          placeholder="Paste your Spotify playlist link" spellcheck="false" />
        <button class="eg-spotify-load" type="submit">Load</button>
      </form>
      <div class="eg-spotify-status" role="status" aria-live="polite"></div>
      <div class="eg-spotify-foot">
        <a class="eg-spotify-open" href="https://open.spotify.com" target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a>
        <small>Music provided by Spotify</small>
      </div>`;
    panel.querySelector('.eg-spotify-close').addEventListener('click', () => setOpen(false));
    panel.querySelector('.eg-spotify-form').addEventListener('submit', (event) => {
      event.preventDefault();
      setSpotifyLink(panel.querySelector('.eg-spotify-input').value, true);
    });
    // Keep taps on the music player from triggering drawing step navigation.
    ['click','pointerdown','pointerup','touchstart','touchend','wheel'].forEach((name) => {
      panel.addEventListener(name, (event) => event.stopPropagation(), {passive: name === 'touchstart' || name === 'touchend' || name === 'wheel'});
    });
    return panel;
  }
  function createButton() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'eg-spotify-toggle';
    el.id = 'eg-spotify-toggle';
    el.setAttribute('aria-controls', 'eg-spotify-panel');
    el.setAttribute('aria-expanded', 'false');
    el.setAttribute('aria-label', 'Toggle Spotify Study Music');
    el.innerHTML = '<span aria-hidden="true">♫</span> Study Music';
    el.addEventListener('click', (event) => { event.stopPropagation(); setOpen(widget.dataset.open !== 'true'); });
    return el;
  }
  function install() {
    const nextViewer=document.querySelector('.eg-viewer');
    const toolbar=nextViewer && nextViewer.querySelector('.eg-viewer-toolbar-actions');
    if(!nextViewer || !toolbar){
      if(viewer){disposePlayer();if(viewerClassObserver)viewerClassObserver.disconnect();viewer=null;wasFullscreen=false;pendingPlay=false;attemptedOnClick=false;}
      return;
    }
    if(!widget)widget=createWidget();if(!button)button=createButton();
    if(viewer!==nextViewer){
      if(viewerClassObserver)viewerClassObserver.disconnect();
      if(viewer){disposePlayer();wasFullscreen=false;pendingPlay=false;attemptedOnClick=false;setOpen(false);}
      viewer=nextViewer;viewerClassObserver=new MutationObserver(syncFullscreenAvailability);
      viewerClassObserver.observe(viewer,{attributes:true,attributeFilter:['class']});
    }
    if(widget.parentElement!==viewer)viewer.appendChild(widget);
    if(button.parentElement!==toolbar)toolbar.appendChild(button);
    if(!currentInfo)setSpotifyLink(readSavedLink() || DEFAULT_LINK,false) || setSpotifyLink(DEFAULT_LINK,false);
    mountPlayer();syncFullscreenAvailability();
  }
  function scheduleInstall(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;install();});}
  // Capture the actual fullscreen click before the browser consumes user activation.
  document.addEventListener('click',event=>{
    const target=event.target.closest && event.target.closest('button');
    if(!target || !viewer || !viewer.contains(target) || fullscreenAvailable())return;
    if(target.dataset.egIcon!=='fullscreen' && !/^full\s*screen$/i.test((target.getAttribute('aria-label')||target.textContent||'').trim()))return;
    attemptedOnClick=true;requestPlay();clearTimeout(entryTimer);
    entryTimer=setTimeout(()=>{if(!fullscreenAvailable()){attemptedOnClick=false;pendingPlay=false;clearTimeout(playbackTimer);if(controller)try{controller.pause();}catch(_){} }},1800);
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  const root=document.getElementById('root');if(root)new MutationObserver(scheduleInstall).observe(root,{subtree:true,childList:true});
  document.addEventListener('fullscreenchange',()=>{syncFullscreenAvailability();scheduleInstall();});
  document.addEventListener('webkitfullscreenchange',()=>{syncFullscreenAvailability();scheduleInstall();});
  window.addEventListener('pageshow',scheduleInstall);
  const sdk=document.createElement('script');sdk.src='https://open.spotify.com/embed/iframe-api/v1';sdk.async=true;
  sdk.onerror=()=>{if(fullscreenAvailable() && !controller)manualFallback();};document.head.appendChild(sdk);
})();
