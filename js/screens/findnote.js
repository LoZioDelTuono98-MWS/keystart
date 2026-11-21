// Gioco "Trova la nota": 60 secondi, l'app dice una nota e tu la premi.
KS.screens.findnote = {
  title: 'Trova la nota',
  mount(root) {
    const { h } = KS.app;
    const P = KS.progress;
    const ROUND = 60;
    const LEVEL_UP = 15; // risposte giuste per passare al livello dopo
    const LEVELS = {
      1: { name: 'Do Re Mi', pcs: [0, 2, 4] },
      2: { name: 'Do → Sol', pcs: [0, 2, 4, 5, 7] },
      3: { name: 'Tutti i tasti bianchi', pcs: [0, 2, 4, 5, 7, 9, 11] },
      4: { name: 'Anche i tasti neri', pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    };
    const MAX = 4;

    let level = Math.min(P.get('findLevel') || 1, MAX);
    let running = false;
    let target = null;
    let score = 0;
    let streak = 0;
    let wrong = 0;
    let timeLeft = ROUND;
    let timer = null;
    let off = null;

    function renderStart() {
      stop();
      root.innerHTML = '';
      const levelBtns = h('div', { class: 'levels' },
        ...Object.keys(LEVELS).map((n) => {
          const num = +n;
          const unlocked = num <= (P.get('findLevel') || 1);
          return h('button', {
            class: 'lvl' + (num === level ? ' sel' : '') + (unlocked ? '' : ' locked'),
            onclick: () => { if (unlocked) { level = num; renderStart(); } },
          }, unlocked ? `Livello ${num}` : '🔒', h('small', null, LEVELS[num].name));
        }));
      const count = P.get('findLevel') === level ? (P.get('findLevelCount') || 0) : null;
      root.append(
        levelBtns,
        count != null && level < MAX
          ? h('p', { class: 'muted' }, `Prossimo livello: ${Math.min(count, LEVEL_UP)} / ${LEVEL_UP} note giuste`)
          : null,
        h('button', { class: 'go', onclick: startRound }, 'VIA!'),
        h('p', { class: 'muted' }, `Record: ${P.get('findBest') || 0} punti`));
      KS.keyboard.setTargets([]);
    }

    let targetEl, subEl, scoreEl, timeEl, streakEl, card;

    function startRound() {
      root.innerHTML = '';
      score = 0; streak = 0; timeLeft = ROUND; running = true;
      scoreEl = h('span', { class: 'stat' }, '0 punti');
      streakEl = h('span', { class: 'stat' }, '');
      timeEl = h('span', { class: 'stat time' }, ROUND + 's');
      targetEl = h('div', { class: 'bignote' }, '');
      subEl = h('div', { class: 'subnote' }, '');
      card = h('div', { class: 'notecard' }, h('div', { class: 'ask' }, 'Suona:'), targetEl, subEl);
      root.append(h('div', { class: 'stats' }, scoreEl, streakEl, timeEl), card,
        h('button', { class: 'ghost', onclick: renderStart }, 'Ferma'));
      next();
      timer = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft + 's';
        timeEl.classList.toggle('hurry', timeLeft <= 10);
        if (timeLeft <= 0) finish();
      }, 1000);
      off = KS.input.on(onNote);
    }

    function next() {
      const pcs = LEVELS[level].pcs;
      let pc;
      do { pc = pcs[Math.floor(Math.random() * pcs.length)]; } while (target != null && pcs.length > 1 && pc === KS.notes.pc(target));
      const [lo] = KS.keyboard.range();
      target = lo + 12 + pc; // nell'ottava centrale della tastiera a schermo
      wrong = 0;
      const lbl = KS.notes.label(target);
      targetEl.textContent = lbl.main;
      subEl.textContent = lbl.sub;
      card.style.setProperty('--c', KS.notes.color(target));
      KS.keyboard.setTargets([]);
    }

    function flash(cls) {
      card.classList.remove('good', 'bad');
      void card.offsetWidth;
      card.classList.add(cls);
    }

    function onNote(ev) {
      if (!running || ev.type !== 'on') return;
      if (KS.notes.pc(ev.note) === KS.notes.pc(target)) {
        streak++;
        score += 1 + Math.floor(streak / 5);
        scoreEl.textContent = score + ' punti';
        streakEl.textContent = streak >= 3 ? `🔥 ${streak} di fila` : '';
        KS.audio.cue(true);
        flash('good');
        if (P.get('findLevel') === level && level < MAX) {
          const c = (P.get('findLevelCount') || 0) + 1;
          P.set('findLevelCount', c);
          if (c >= LEVEL_UP) { P.set('findLevel', level + 1); P.set('findLevelCount', 0); }
        }
        setTimeout(() => running && next(), 180);
      } else {
        streak = 0;
        streakEl.textContent = '';
        wrong++;
        KS.audio.cue(false);
        flash('bad');
        if (wrong >= 2) KS.keyboard.setTargets([target]); // aiutino dopo 2 errori
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
      const best = P.get('findBest') || 0;
      const record = score > best;
      if (record) P.set('findBest', score);
      const unlocked = (P.get('findLevel') || 1) > level;
      root.innerHTML = '';
      root.append(
        h('div', { class: 'result' },
          h('div', { class: 'result-emoji' }, record ? '🏆' : score > 10 ? '⭐' : '👍'),
          h('div', { class: 'result-score' }, `${score} punti`),
          record ? h('p', null, 'Nuovo record!') : h('p', { class: 'muted' }, `Record: ${best}`),
          unlocked ? h('p', { class: 'unlock' }, `🔓 Hai sbloccato il livello ${level + 1}!`) : null),
        h('button', { class: 'go', onclick: () => { if (unlocked) level++; startRound(); } },
          unlocked ? 'Prova il nuovo livello' : 'Ancora!'),
        h('button', { class: 'ghost', onclick: renderStart }, 'Cambia livello'));
      KS.keyboard.setTargets([]);
    }

    renderStart();
    return stop;
  },
};
