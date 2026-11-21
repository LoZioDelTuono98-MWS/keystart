// Tastiera a schermo: mostra i tasti premuti, evidenzia il tasto da suonare, si può toccare.
KS.keyboard = (() => {
  const el = document.getElementById('keyboard');
  const hint = document.getElementById('octaveHint');
  let lo = 48;
  let hi = 72;
  let keys = new Map();
  let targets = new Set();
  let locked = false; // se true l'intervallo non si sposta da solo

  function render() {
    el.innerHTML = '';
    keys = new Map();
    const whites = [];
    for (let m = lo; m <= hi; m++) if (!KS.notes.isBlack(m)) whites.push(m);
    const w = 100 / whites.length;
    const showLabels = KS.settings.get('keyLabels');

    let wi = 0;
    for (let m = lo; m <= hi; m++) {
      const k = document.createElement('div');
      const black = KS.notes.isBlack(m);
      k.className = 'key ' + (black ? 'black' : 'white');
      k.dataset.note = m;
      if (black) {
        k.style.left = `calc(${wi * w}% - ${w * 0.32}%)`;
        k.style.width = `${w * 0.64}%`;
      } else {
        k.style.left = `${wi * w}%`;
        k.style.width = `${w}%`;
        wi++;
        const strip = document.createElement('span');
        strip.className = 'strip';
        strip.style.background = KS.notes.color(m);
        k.appendChild(strip);
        if (showLabels) {
          const lab = document.createElement('span');
          lab.className = 'lab';
          lab.textContent = KS.notes.label(m).main;
          k.appendChild(lab);
        }
        if (KS.notes.pc(m) === 0) {
          const oc = document.createElement('span');
          oc.className = 'oct';
          oc.textContent = KS.notes.octave(m);
          k.appendChild(oc);
        }
      }
      bindPointer(k, m);
      el.appendChild(k);
      keys.set(m, k);
    }
    KS.input.held().forEach((n) => setDown(n, true));
    applyTargets();
    hint.textContent = '';
  }

  function bindPointer(k, m) {
    let down = false;
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      down = true;
      try { k.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
      KS.input.emit('on', m, 100, 'touch');
    });
    const up = () => { if (down) { down = false; KS.input.emit('off', m, 0, 'touch'); } };
    k.addEventListener('pointerup', up);
    k.addEventListener('pointercancel', up);
    k.addEventListener('lostpointercapture', up);
  }

  function setRange(newLo, newHi) {
    lo = newLo;
    hi = newHi == null ? newLo + 24 : newHi;
    render();
  }

  function ensureVisible(m) {
    if (locked || (m >= lo && m <= hi)) return;
    const base = Math.floor(m / 12) * 12;
    setRange(m - base >= 6 ? base : base - 12);
  }

  function setDown(m, isDown) {
    const k = keys.get(m);
    if (!k) return;
    k.classList.toggle('down', isDown);
    if (isDown) k.style.setProperty('--c', KS.notes.color(m));
  }

  function applyTargets() {
    keys.forEach((k, m) => {
      const t = targets.has(m);
      k.classList.toggle('target', t);
      if (t) k.style.setProperty('--c', KS.notes.color(m));
    });
    const missing = [...targets].filter((m) => m < lo || m > hi);
    hint.textContent = missing.length
      ? (missing[0] < lo ? '⬇ La nota è più in basso: premi OCTAVE −' : '⬆ La nota è più in alto: premi OCTAVE +')
      : '';
  }

  function setTargets(list) { targets = new Set(list); applyTargets(); }
  function lock(v) { locked = v; }

  KS.input.on((ev) => {
    if (ev.type === 'on') ensureVisible(ev.note);
    setDown(ev.note, ev.type === 'on');
  });
  KS.settings.onChange((k) => { if (k === 'keyLabels' || k === 'names') render(); });

  return { render, setRange, setTargets, lock, range: () => [lo, hi] };
})();
