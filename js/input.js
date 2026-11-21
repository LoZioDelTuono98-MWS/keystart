// Ingressi: tastiera MIDI (Web MIDI), tastiera del computer, tocco sui tasti a schermo.
KS.input = (() => {
  const listeners = new Set();
  const statusListeners = new Set();
  let status = { state: 'idle', name: '' };
  const held = new Set();

  function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function onStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); }
  function setStatus(s) { status = s; statusListeners.forEach((fn) => fn(s)); }

  function emit(type, note, vel, source) {
    if (type === 'on') { held.add(note); KS.audio.noteOn(note, vel); }
    else { held.delete(note); KS.audio.noteOff(note); }
    listeners.forEach((fn) => fn({ type, note, vel, source }));
  }

  // ---- MIDI ----
  function handleMidi(e) {
    const [st, d1, d2] = e.data;
    const cmd = st & 0xf0;
    if (cmd === 0x90 && d2 > 0) emit('on', d1, d2, 'midi');
    else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) emit('off', d1, 0, 'midi');
  }

  async function initMIDI() {
    if (!navigator.requestMIDIAccess) { setStatus({ state: 'unsupported', name: '' }); return; }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      const bind = () => {
        const names = [];
        access.inputs.forEach((inp) => { inp.onmidimessage = handleMidi; names.push(inp.name); });
        setStatus(names.length ? { state: 'connected', name: names.join(', ') } : { state: 'none', name: '' });
      };
      access.onstatechange = bind;
      bind();
    } catch (e) {
      setStatus({ state: 'denied', name: '' });
    }
  }

  // ---- Tastiera del computer ----
  // Riga centrale = tasti bianchi, riga sopra = tasti neri. Z / X cambiano ottava.
  const KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
                   k: 12, o: 13, l: 14, p: 15, 'ò': 16, ';': 16 };
  let pcBase = 60;
  const pcDown = new Map();

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'z') { pcBase = Math.max(24, pcBase - 12); return; }
    if (k === 'x') { pcBase = Math.min(96, pcBase + 12); return; }
    if (k in KEYMAP && !pcDown.has(k)) {
      const n = pcBase + KEYMAP[k];
      pcDown.set(k, n);
      emit('on', n, 100, 'pc');
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (pcDown.has(k)) { emit('off', pcDown.get(k), 0, 'pc'); pcDown.delete(k); }
  });
  window.addEventListener('blur', () => {
    pcDown.forEach((n) => emit('off', n, 0, 'pc'));
    pcDown.clear();
  });

  // Il primo tocco/clic sblocca l'audio del browser.
  const unlock = () => KS.audio.ensure();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  return { on, onStatus, emit, initMIDI, held: () => [...held], getStatus: () => status };
})();
