'use strict';
(() => {
  const status = document.getElementById('offlineStatus');
  const install = document.getElementById('installApp');
  const update = document.getElementById('updateApp');
  const help = document.getElementById('installHelp');
  const instructions = document.getElementById('installInstructions');
  let ready = false, registration, installPrompt, updating = false;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function showStatus() {
    status.textContent = ready
      ? (navigator.onLine ? 'Offline guides ready · Online' : 'Offline guides ready · Offline — official links need internet')
      : (navigator.onLine ? 'Preparing offline guides… Keep this page open briefly.' : 'Offline preparation is not complete. Connect to the internet and reopen the app.');
    install.hidden = standalone();
  }
  const checkCache = () => (navigator.serviceWorker?.controller || registration?.active)?.postMessage({type:'CHECK_OFFLINE'});
  window.addEventListener('online', () => {showStatus(); registration?.update().catch(() => {}); checkCache();});
  window.addEventListener('offline', showStatus);
  window.addEventListener('beforeinstallprompt', event => {event.preventDefault(); installPrompt = event; install.textContent = 'Install app';});
  window.addEventListener('appinstalled', () => {installPrompt = null; install.hidden = true;});
  install.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try {await prompt.prompt(); await prompt.userChoice;} catch (_) {}
      return;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    instructions.innerHTML = isIOS
      ? '<ol><li>Open this website in Safari.</li><li>Tap Share (square with an upward arrow).</li><li>Choose Add to Home Screen. If needed, tap More or Edit Actions to find it.</li><li>Keep Open as Web App enabled if shown, then tap Add.</li></ol>'
      : '<ol><li>Open this website in Chrome, Edge or another browser that supports web apps.</li><li>Open the browser menu.</li><li>Choose Install app or Add to Home screen, then confirm.</li></ol>';
    help.showModal();
  });
  document.getElementById('closeInstall').onclick = () => help.close();
  update.onclick = () => {
    if (!registration?.waiting) return;
    if (!confirm('Update the app now? Your saved guides remain, but this page will reload and clear current checklist checks. Finish any unsaved custom guide first.')) return;
    updating = true;
    registration.waiting.postMessage({type:'SKIP_WAITING'});
  };
  showStatus();
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'This browser cannot prepare offline access. The guides still work while online.';
    return;
  }
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'OFFLINE_STATE') {ready = event.data.ready === true; showStatus();}
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) {window.location.reload(); return;}
    checkCache();
  });
  navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).then(async reg => {
    registration = reg;
    function offerUpdate() {if (reg.waiting && navigator.serviceWorker.controller) update.hidden = false;}
    offerUpdate();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') {offerUpdate(); checkCache();}
      });
    });
    await navigator.serviceWorker.ready;
    checkCache();
    reg.update().catch(() => {});
  }).catch(() => {status.textContent = 'Offline preparation failed. Reconnect and refresh. Online guides remain available.';});
})();
