// Piccoli aiutanti per costruire le schermate.
KS.screens = KS.screens || {};

// append / replaceChildren ignorano null e false: così si possono scrivere parti opzionali in linea.
['append', 'replaceChildren'].forEach((fn) => {
  const orig = Element.prototype[fn];
  Element.prototype[fn] = function (...kids) { return orig.apply(this, kids.filter((k) => k != null && k !== false)); };
});

KS.ui = (() => {
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style') el.style.cssText = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    children.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return el;
  }

  // Interruttore a segmenti: options = [[valore, testo], ...]
  function seg(options, value, onChange) {
    const wrap = h('div', { class: 'seg' });
    const draw = (val) => {
      wrap.replaceChildren(...options.map(([v, t]) =>
        h('button', { class: v === val ? 'on' : '', onclick: () => { draw(v); onChange(v); } }, t)));
    };
    draw(value);
    return wrap;
  }

  function flash(el, cls) {
    el.classList.remove('good', 'bad', 'pop');
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // Bottone che chiede conferma con un secondo tocco (niente finestre di dialogo).
  function confirmBtn(text, onConfirm, cls) {
    let armed = false;
    let timer = null;
    const b = h('button', {
      class: cls || 'del',
      onclick: (e) => {
        e.stopPropagation();
        if (armed) { clearTimeout(timer); onConfirm(); return; }
        armed = true;
        b.textContent = 'Sicuro?';
        b.classList.add('sure');
        timer = setTimeout(() => { armed = false; b.textContent = text; b.classList.remove('sure'); }, 2500);
      },
    }, text);
    return b;
  }

  function matches(played, target) {
    return KS.settings.get('anyOctave') ? KS.notes.pc(played) === KS.notes.pc(target) : played === target;
  }

  return { h, seg, flash, confirmBtn, matches };
})();

// Gioco a tempo riutilizzabile (Trova la nota, Leggi la nota).
// cfg: { prog, levels: {n: {name}}, pool(level) -> [midi], show(target, els), seconds, levelUp }
KS.roundGame = function roundGame(root, cfg) {
  const { h, flash } = KS.ui;
  const P = KS.progress;
  const SECONDS = cfg.seconds || 60;
  const LEVEL_UP = cfg.levelUp || 15;
  const MAX = Object.keys(cfg.levels).length;
  const key = (k) => cfg.prog + k;

  let level = Math.min(P.get(key('Level')) || 1, MAX);
  let running = false;
  let target = null;
  let score = 0;
  let streak = 0;
  let wrong = 0;
  let timeLeft = SECONDS;
  let timer = null;
  let off = null;
  let els = {};

  function unlockedLevel() { return P.get(key('Level')) || 1; }

  function renderStart() {
    stop();
    root.replaceChildren();
    root.classList.add('enter');
    const levelBtns = h('div', { class: 'levels' },
      ...Object.keys(cfg.levels).map((n) => {
        const num = +n;
        const unlocked = num <= unlockedLevel();
        return h('button', {
          class: 'lvl' + (num === level ? ' sel' : '') + (unlocked ? '' : ' locked'),
          onclick: () => { if (unlocked) { level = num; renderStart(); } },
        }, unlocked ? `Livello ${num}` : '🔒 Bloccato', h('small', null, cfg.levels[num].name));
      }));
    const count = unlockedLevel() === level ? (P.get(key('LevelCount')) || 0) : null;
    root.append(
      cfg.intro ? h('p', { class: 'muted center' }, cfg.intro) : null,
      levelBtns,
      count != null && level < MAX
        ? h('p', { class: 'progress-txt' }, `Per sbloccare il prossimo livello: ${Math.min(count, LEVEL_UP)} / ${LEVEL_UP} giuste`)
        : null,
      h('button', { class: 'go', onclick: startRound }, 'VIA!'),
      h('p', { class: 'progress-txt' }, `Record: ${P.get(key('Best')) || 0} punti`));
    KS.keyboard.setTargets([]);
  }

  function startRound() {
    root.replaceChildren();
    root.classList.remove('enter');
    score = 0; streak = 0; timeLeft = SECONDS; running = true; target = null;
    els.score = h('span', { class: 'stat' }, '0 punti');
    els.streak = h('span', { class: 'stat' }, '');
    els.time = h('span', { class: 'stat time' }, SECONDS + 's');
    els.card = h('div', { class: 'notecard' });
    root.append(h('div', { class: 'stats' }, els.score, els.streak, els.time), els.card,
      h('button', { class: 'ghost', style: 'align-self:center', onclick: renderStart }, 'Ferma'));
    next();
    timer = setInterval(() => {
      timeLeft--;
      els.time.textContent = timeLeft + 's';
      els.time.classList.toggle('hurry', timeLeft <= 10);
      if (timeLeft <= 0) finish();
    }, 1000);
    off = KS.input.on(onNote);
  }

  function next() {
    const pool = cfg.pool(level);
    let n;
    let guard = 0;
    do { n = pool[Math.floor(Math.random() * pool.length)]; guard++; }
    while (target != null && pool.length > 1 && n === target && guard < 20);
    target = n;
    wrong = 0;
    els.card.style.setProperty('--c', KS.notes.color(target));
    cfg.show(target, els.card, false);
    KS.keyboard.setTargets([]);
  }

  function onNote(ev) {
    if (!running || ev.type !== 'on') return;
    if (KS.ui.matches(ev.note, target)) {
      streak++;
      score += 1 + Math.floor(streak / 5);
      els.score.textContent = score + ' punti';
      els.streak.textContent = streak >= 3 ? `🔥 ${streak}` : '';
      KS.audio.cue(true);
      KS.stats.hit();
      flash(els.card, 'good');
      if (cfg.show.reveal) cfg.show.reveal(target, els.card);
      if (unlockedLevel() === level && level < MAX) {
        const c = (P.get(key('LevelCount')) || 0) + 1;
        P.set(key('LevelCount'), c);
        if (c >= LEVEL_UP) { P.set(key('Level'), level + 1); P.set(key('LevelCount'), 0); }
      }
      setTimeout(() => running && next(), cfg.show.reveal ? 450 : 180);
    } else {
      streak = 0;
      els.streak.textContent = '';
      wrong++;
      KS.audio.cue(false);
      flash(els.card, 'bad');
      if (wrong >= 2) KS.keyboard.setTargets([target]);
    }
  }

  function stop() {
    running = false;
    if (timer) clearInterval(timer);
    timer = null;
    if (off) off();
    off = null;
  }

  function finish() {
    stop();
    const best = P.get(key('Best')) || 0;
    const record = score > best;
    if (record) P.set(key('Best'), score);
    const unlocked = unlockedLevel() > level;
    root.replaceChildren();
    root.classList.add('enter');
    root.append(
      h('div', { class: 'card result' },
        h('div', { class: 'result-emoji' }, record ? '🏆' : score > 10 ? '⭐' : '👍'),
        h('div', { class: 'result-score' }, `${score} punti`),
        record ? h('p', null, 'Nuovo record!') : h('p', { class: 'muted' }, `Record: ${best}`),
        unlocked ? h('p', { class: 'unlock' }, `🔓 Livello ${level + 1} sbloccato!`) : null),
      h('button', { class: 'go', onclick: () => { if (unlocked) level++; startRound(); } },
        unlocked ? 'Nuovo livello' : 'Ancora!'),
      h('button', { class: 'ghost', style: 'align-self:center', onclick: renderStart }, 'Cambia livello'));
    KS.keyboard.setTargets([]);
  }

  renderStart();
  return stop;
};
