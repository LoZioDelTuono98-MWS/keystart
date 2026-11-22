// Salvataggio locale (impostazioni, progressi, canzoni e giri). Tutto resta sul dispositivo.
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
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  return { read, write };
})();

KS.settings = (() => {
  const DEFAULTS = {
    names: 'both',      // 'it' | 'en' | 'both'
    sound: true,        // suono dell'app
    keyLabels: true,    // nomi sui tasti
    anyOctave: true,    // accetta la nota giusta in qualsiasi ottava
    mode: 'auto',       // 'auto' | 'light' | 'dark'
    theme: 'mare',      // tema colore
    showChordKeys: true,// accordi: mostra i tasti da premere
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
  const DEFAULTS = {
    findLevel: 1, findLevelCount: 0, findBest: 0,
    readLevel: 1, readLevelCount: 0, readBest: 0,
    chordLevel: 1, chordLevelCount: 0,
    songsDone: {}, days: [], today: { date: '', hits: 0 },
  };
  let data = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), KS.store.read('progress', {}));
  return {
    get: (k) => data[k],
    set(k, v) { data[k] = v; KS.store.write('progress', data); },
    reset() { data = JSON.parse(JSON.stringify(DEFAULTS)); KS.store.write('progress', data); },
  };
})();

// Giorni di pratica di fila: conta quando fai almeno una nota giusta in un esercizio.
KS.stats = (() => {
  const dayKey = (d) => {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  function hit() {
    const today = dayKey(new Date());
    const t = KS.progress.get('today') || {};
    KS.progress.set('today', { date: today, hits: (t.date === today ? t.hits : 0) + 1 });
    const days = KS.progress.get('days') || [];
    if (days[days.length - 1] !== today) {
      days.push(today);
      KS.progress.set('days', days.slice(-400));
    }
  }

  function streak() {
    const days = new Set(KS.progress.get('days') || []);
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // oggi non ancora: conta fino a ieri
    let n = 0;
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function todayHits() {
    const t = KS.progress.get('today') || {};
    return t.date === dayKey(new Date()) ? t.hits : 0;
  }

  return { hit, streak, todayHits };
})();

// Le tue canzoni importate e i giri di accordi della band.
KS.library = (() => {
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = (key) => KS.store.read(key, []);
  function add(key, item) {
    const items = list(key);
    item.id = item.id || uid();
    items.unshift(item);
    if (!KS.store.write(key, items)) throw new Error('Spazio pieno: elimina qualcosa e riprova.');
    return item;
  }
  function update(key, item) {
    const items = list(key).map((x) => (x.id === item.id ? item : x));
    KS.store.write(key, items);
  }
  function remove(key, id) { KS.store.write(key, list(key).filter((x) => x.id !== id)); }
  return {
    songs: () => list('mySongs'),
    addSong: (s) => add('mySongs', s),
    removeSong: (id) => remove('mySongs', id),
    progs: () => list('myProgs'),
    addProg: (p) => add('myProgs', p),
    updateProg: (p) => update('myProgs', p),
    removeProg: (id) => remove('myProgs', id),
  };
})();
