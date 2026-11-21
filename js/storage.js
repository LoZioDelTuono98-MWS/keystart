// Salvataggio locale (impostazioni e progressi). Tutto resta sul dispositivo.
window.KS = window.KS || {};

KS.store = (() => {
  const PREFIX = 'keystart:';
  const mem = {};

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return key in mem ? mem[key] : fallback;
    }
  }

  function write(key, value) {
    mem[key] = value;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage non disponibile */ }
  }

  return { read, write };
})();

KS.settings = (() => {
  const DEFAULTS = {
    names: 'both',      // 'it' | 'en' | 'both'
    sound: true,        // suono dell'app
    keyLabels: true,    // nomi sui tasti
    anyOctave: true,    // accetta la nota giusta in qualsiasi ottava
  };
  let data = Object.assign({}, DEFAULTS, KS.store.read('settings', {}));
  const listeners = new Set();

  return {
    get: (k) => data[k],
    set(k, v) {
      data[k] = v;
      KS.store.write('settings', data);
      listeners.forEach((fn) => fn(k, v));
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

KS.progress = (() => {
  const DEFAULTS = { findLevel: 1, findLevelCount: 0, findBest: 0, songsDone: {} };
  let data = Object.assign({}, DEFAULTS, KS.store.read('progress', {}));
  return {
    get: (k) => data[k],
    set(k, v) { data[k] = v; KS.store.write('progress', data); },
    reset() { data = JSON.parse(JSON.stringify(DEFAULTS)); KS.store.write('progress', data); },
  };
})();
