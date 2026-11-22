// "Accordi": l'app mostra un accordo, tu lo suoni (tutte le note insieme, in qualsiasi rivolto).

// Controlla le note tenute premute contro un accordo: 'ok' | 'wrong' | 'partial'
KS.chordCheck = (ch, held) => {
  const pcs = new Set(held.map(KS.notes.pc));
  const tones = KS.notes.chordTones(ch);
  for (const p of pcs) if (!tones.includes(p)) return 'wrong';
  return KS.notes.chordNeed(ch).every((p) => pcs.has(p)) ? 'ok' : 'partial';
};

// Scheda grande dell'accordo, riusata anche nei giri.
KS.chordCard = (ch, opts) => {
  const { h } = KS.ui;
  const lbl = KS.notes.chordLabel(ch);
  const tones = KS.notes.chordTones(ch);
  const chips = tones.map((t) => {
    const c = h('span', { class: 'tone', 'data-pc': t }, KS.notes.label(t, ch.flat).main);
    c.style.setProperty('--c', KS.notes.color(t));
    return c;
  });
  const card = h('div', { class: 'card center' },
    opts && opts.ask ? h('div', { class: 'ask' }, opts.ask) : null,
    h('div', { class: 'chordname' }, lbl.main),
    h('div', { class: 'chordsub' }, [lbl.word, lbl.sub].filter(Boolean).join(' · ')),
    h('div', { class: 'tones' }, chips));
  card.markHeld = (held) => {
    const pcs = new Set(held.map(KS.notes.pc));
    chips.forEach((c) => c.classList.toggle('hit', pcs.has(+c.dataset.pc)));
  };
  return card;
};

KS.screens.chords = {
  title: 'Accordi',
  mount(root) {
    const { h, flash } = KS.ui;
    const P = KS.progress;
    const LEVELS = KS.progressions.LEVELS;
    const MAX = Object.keys(LEVELS).length;
    const LEVEL_UP = 12;
    let level = Math.min(P.get('chordLevel') || 1, MAX);
    let off = null;
    let current = null;
    let voicing = null;
    let card = null;
    let done = 0;
    let solved = false;
    let wrongShown = false;

    function menu() {
      if (off) { off(); off = null; }
      root.replaceChildren();
      root.classList.add('enter');
      const unlocked = P.get('chordLevel') || 1;
      root.append(
        h('p', { class: 'muted center' }, 'Suona tutte le note dell\'accordo insieme. L\'ordine non conta: va bene qualsiasi rivolto.'),
        h('div', { class: 'levels' }, ...Object.keys(LEVELS).map((n) => {
          const num = +n;
          const ok = num <= unlocked;
          return h('button', {
            class: 'lvl' + (num === level ? ' sel' : '') + (ok ? '' : ' locked'),
            onclick: () => { if (ok) { level = num; menu(); } },
          }, ok ? `Livello ${num}` : '🔒 Bloccato', h('small', null, LEVELS[num].name));
        })),
        unlocked === level && level < MAX
          ? h('p', { class: 'progress-txt' }, `Prossimo livello: ${Math.min(P.get('chordLevelCount') || 0, LEVEL_UP)} / ${LEVEL_UP} accordi giusti`) : null,
        h('div', { class: 'sec' }, h('div', { class: 'label' }, 'Mostra i tasti da premere'),
          KS.ui.seg([[true, 'Sì'], [false, 'No, mi metto alla prova']], KS.settings.get('showChordKeys'), (v) => KS.settings.set('showChordKeys', v))),
        h('button', { class: 'go', onclick: play }, 'VIA!'));
    }

    function play() {
      root.replaceChildren();
      root.classList.remove('enter');
      done = 0;
      const counter = h('span', { class: 'stat' }, '0 ✓');
      const area = h('div');
      root.append(h('div', { class: 'stats' }, counter, h('button', { class: 'ghost', onclick: menu }, 'Fine')), area);
      const pool = LEVELS[level].chords.split(' ').map(KS.notes.parseChord);

      function next() {
        let ch;
        let guard = 0;
        do { ch = pool[Math.floor(Math.random() * pool.length)]; guard++; }
        while (current && pool.length > 1 && ch.root === current.root && ch.q === current.q && guard < 20);
        current = ch;
        solved = false;
        voicing = KS.notes.voicing(ch, voicing);
        card = KS.chordCard(ch, { ask: 'Suona' });
        area.replaceChildren(card);
        KS.keyboard.setTargets(KS.settings.get('showChordKeys') ? voicing : []);
        card.markHeld(KS.input.held());
      }

      off = KS.input.on(() => {
        if (solved) return;
        const held = KS.input.held();
        card.markHeld(held);
        const r = KS.chordCheck(current, held);
        if (r === 'ok') {
          solved = true;
          done++;
          counter.textContent = `${done} ✓`;
          KS.audio.cue(true);
          KS.stats.hit();
          flash(card, 'good');
          if ((P.get('chordLevel') || 1) === level && level < MAX) {
            const c = (P.get('chordLevelCount') || 0) + 1;
            P.set('chordLevelCount', c);
            if (c >= LEVEL_UP) {
              P.set('chordLevel', level + 1);
              P.set('chordLevelCount', 0);
              area.append(h('p', { class: 'unlock center' }, `🔓 Livello ${level + 1} sbloccato!`));
            }
          }
          setTimeout(next, 700);
        } else if (r === 'wrong' && !wrongShown) {
          wrongShown = true;
          flash(card, 'bad');
          setTimeout(() => { wrongShown = false; }, 600);
        }
      });
      next();
    }

    menu();
    return () => { if (off) off(); };
  },
};
