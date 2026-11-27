
(function () {
  "use strict";
  const el = id => document.getElementById(id);
  const root = el('root'), gate = el('trace-auth'), account = el('trace-auth-account');
  const button = el('trace-auth-google'), label = el('trace-auth-button-label'), retry = el('trace-auth-retry');
  const logout = el('trace-auth-logout'), photo = el('trace-auth-photo'), accountError = el('trace-auth-account-error');
  let auth, sdk, provider, ready = false, currentUser = null, busy = false, resetting = false;
  function message(text, error = false) {
    const node = el('trace-auth-message'); node.textContent = text; node.dataset.error = String(error);
  }
  function showLocked() {
    document.documentElement.classList.add('trace-auth-locked'); root.inert = true; root.setAttribute('aria-hidden','true');
    gate.hidden = false; account.hidden = true;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  }
  function showUser(user) {
    const name = user.displayName || user.email || 'Trace learner';
    el('trace-auth-name').textContent = name;
    el('trace-auth-email').textContent = user.email || '';
    el('trace-auth-initial').textContent = Array.from(name.trim())[0]?.toUpperCase() || 'T';
    photo.hidden = true; photo.removeAttribute('src');
    try { const url = new URL(user.photoURL || ''); if (url.protocol === 'https:') photo.src = url.href; } catch (_) {}
    account.hidden = false; accountError.hidden = true;
    gate.hidden = true; root.inert = false; root.removeAttribute('aria-hidden');
    document.documentElement.classList.remove('trace-auth-locked');
  }
  function mountAccount() {
    const slot = root.querySelector('#trace-auth-account-slot');
    if (slot && account.parentNode !== slot) slot.appendChild(account);
  }
  new MutationObserver(mountAccount).observe(root,{childList:true,subtree:true}); mountAccount();
  photo.addEventListener('load',()=>{photo.hidden=false;});
  photo.addEventListener('error',()=>{photo.hidden=true;});
  retry.addEventListener('click',()=>location.reload());
  function friendly(error) {
    switch(error?.code) {
      case 'auth/popup-closed-by-user': return 'Sign-in was cancelled. You can try again.';
      case 'auth/popup-blocked': return 'Allow pop-ups for Trace, then try again.';
      case 'auth/unauthorized-domain': return 'This website domain must be authorized in Firebase Authentication.';
      case 'auth/operation-not-allowed': return 'Google sign-in must be enabled in Firebase Authentication.';
      case 'auth/invalid-api-key': return 'Trace’s Firebase configuration is invalid.';
      case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
      case 'auth/web-storage-unsupported': return 'Enable browser storage or open Trace in a regular browser.';
      default: return 'Google sign-in could not be completed. Please try again in your browser.';
    }
  }
  button.addEventListener('click', async () => {
    if (!ready || busy || currentUser) return;
    busy = true; button.disabled = true; label.textContent = 'Signing in…'; message('Choose your Google account in the pop-up.');
    try { await sdk.signInWithPopup(auth, provider); }
    catch (error) { message(friendly(error),true); }
    finally { busy = false; button.disabled = !ready; label.textContent = 'Continue with Google'; }
  });
  logout.addEventListener('click', async () => {
    if (!auth || !currentUser || resetting) return;
    logout.disabled = true; accountError.hidden = true;
    try { await sdk.signOut(auth); }
    catch (_) { accountError.textContent = 'Could not sign out. Please try again.'; accountError.hidden = false; logout.disabled = false; }
  });
  async function start() {
    const config = window.TRACE_FIREBASE_CONFIG;
    if (!config || ['apiKey','authDomain','projectId','appId'].some(key => !config[key] || /YOUR_/.test(config[key]))) {
      message('Google sign-in is not configured yet. The site owner must connect Firebase.',true); return;
    }
    if (location.protocol !== 'https:' && !(location.protocol === 'http:' && ['localhost','127.0.0.1'].includes(location.hostname))) {
      message('Open Trace on HTTPS or an authorized local development server to sign in.',true); return;
    }
    try {
      const [app, authModule] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js')
      ]);
      sdk = authModule; auth = sdk.getAuth(app.initializeApp(config));
      await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      provider = new sdk.GoogleAuthProvider(); provider.setCustomParameters({prompt:'select_account'});
      sdk.onAuthStateChanged(auth, user => {
        const old = currentUser; currentUser = user; ready = true; retry.hidden = true;
        if (old && (!user || old.uid !== user.uid)) {
          resetting = true; showLocked(); message('Refreshing your session…'); location.reload(); return;
        }
        if (user) { showUser(user); }
        else { showLocked(); button.disabled = busy; message('Sign in to access the learning workspace.'); }
      }, error => { ready = false; button.disabled = true; showLocked(); message(friendly(error),true); retry.hidden = false; });
    } catch (error) { button.disabled = true; showLocked(); message(error?.code ? friendly(error) : 'Could not load Google sign-in. Check your internet connection.',true); retry.hidden = false; }
  }
  showLocked(); start();
})();
