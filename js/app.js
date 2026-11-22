// Navigazione tra le schermate e stato della tastiera MIDI.
KS.app = (() => {
  const root = document.getElementById('screen');
  const title = document.getElementById('title');
  const back = document.getElementById('backBtn');
  const gear = document.getElementById('gearBtn');
  const pill = document.getElementById('midiStatus');
  let cleanup = null;
  let current = null;
  let currentParams = {};
  let history = [];

  function go(name, params, opts) {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    if (!(opts && opts.back) && !(opts && opts.replace) && current && current !== name) history.push([current, currentParams]);
    if (name === 'home') history = [];
    currentParams = params || {};
    const scr = KS.screens[name];
    current = name;
    root.replaceChildren();
    root.className = 'screen screen-' + name;
    title.textContent = (params && params.title) || scr.title || 'KeyStart';
    back.hidden = name === 'home';
    gear.hidden = name === 'settings';
    KS.keyboard.setTargets([]);
    KS.keyboard.lock(false);
    cleanup = scr.mount(root, params || {}) || null;
    window.scrollTo(0, 0);
  }

  function goBack() {
    const [prev, params] = history.pop() || ['home', {}];
    go(prev, params, { back: true });
  }

  back.addEventListener('click', goBack);
  gear.addEventListener('click', () => go('settings'));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current !== 'home') goBack(); });

  KS.input.onStatus((s) => {
    const map = {
      idle: ['…', ''],
      connected: [s.name, 'ok'],
      none: [KS.input.isApp ? 'Collega la tastiera' : 'Nessuna tastiera', ''],
      unsupported: ['MIDI: usa Chrome o Edge', 'warn'],
      denied: ['Permesso MIDI negato', 'warn'],
    };
    const [txt, cls] = map[s.state] || map.idle;
    pill.textContent = txt;
    pill.className = 'pill ' + cls;
  });

  // Tasto "indietro" di Android.
  if (KS.input.isApp) {
    window.Capacitor.addListener('App', 'backButton', () => {
      if (current === 'home') window.Capacitor.nativePromise('App', 'exitApp', {}).catch(() => {});
      else goBack();
    });
  }

  function start() {
    KS.keyboard.setRange(48, 72);
    KS.input.initMIDI();
    go('home');
    if (!KS.input.isApp && 'serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { go, goBack, start, current: () => current };
})();

KS.app.start();
