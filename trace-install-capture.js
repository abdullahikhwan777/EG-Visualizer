
window.traceInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(event){event.preventDefault();window.traceInstallPrompt=event;window.dispatchEvent(new Event('trace-install-available'));});
