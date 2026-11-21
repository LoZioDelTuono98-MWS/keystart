// Navigazione tra le schermate e stato della tastiera MIDI.
KS.screens = KS.screens || {};

KS.app = (() => {
  const root = document.getElementById('screen');
  const title = document.getElementById('title');
  const back = document.getElementById('backBtn');
  const pill = document.getElementById('midiStatus');
  let cleanup = null;
  let current = null;

  function go(name, params) {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } }
    cleanup = null;
    const scr = KS.screens[name];
    current = name;
    root.innerHTML = '';
    root.className = 'screen screen-' + name;
    title.textContent = scr.title || 'KeyStart';
    back.hidden = name === 'home';
    KS.keyboard.setTargets([]);
    KS.keyboard.lock(false);
    cleanup = scr.mount(root, params || {}) || null;
    window.scrollTo(0, 0);
  }

  back.addEventListener('click', () => go('home'));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current !== 'home') go('home'); });

  KS.input.onStatus((s) => {
    const map = {
      idle: ['…', 'grey'],
      connected: ['🎹 ' + s.name, 'ok'],
      none: [KS.input.isApp ? 'Collega la tastiera (USB-C)' : 'Nessuna tastiera MIDI', 'grey'],
      unsupported: ['MIDI non supportato: usa Chrome o Edge', 'warn'],
      denied: ['Permesso MIDI negato', 'warn'],
    };
    const [txt, cls] = map[s.state] || map.idle;
    pill.textContent = txt;
    pill.className = 'pill ' + cls;
  });

  // Helper per creare elementi in fretta.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') el.className = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style') el.style.cssText = v;
        else el.setAttribute(k, v);
      }
    }
    children.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }

  // Scegli il pezzo di tastiera da mostrare per una lista di note.
  function rangeFor(notes) {
    const min = Math.min(...notes);
    const max = Math.max(...notes);
    let lo = Math.floor(min / 12) * 12;
    let hi = lo + 24;
    while (max > hi) hi += 12;
    return [lo, hi];
  }

  function matches(played, target) {
    return KS.settings.get('anyOctave') ? KS.notes.pc(played) === KS.notes.pc(target) : played === target;
  }

  function start() {
    KS.keyboard.setRange(48, 72);
    KS.input.initMIDI();
    go('home');
    if (!KS.input.isApp && 'serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { go, h, rangeFor, matches, start };
})();

KS.app.start();
