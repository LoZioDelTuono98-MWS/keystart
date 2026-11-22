// "Trova la nota" e "Leggi la nota": stessi livelli e stesso gioco da 60 secondi.
const WHITE = [0, 2, 4, 5, 7, 9, 11];

KS.screens.findnote = {
  title: 'Trova la nota',
  mount(root) {
    const { h } = KS.ui;
    const LEVELS = {
      1: { name: 'Do Re Mi', pcs: [0, 2, 4] },
      2: { name: 'Da Do a Sol', pcs: [0, 2, 4, 5, 7] },
      3: { name: 'Tutti i tasti bianchi', pcs: WHITE },
      4: { name: 'Anche i tasti neri', pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    };
    const show = (target, card) => {
      const lbl = KS.notes.label(target);
      card.replaceChildren(h('div', { class: 'ask' }, 'Suona'), h('div', { class: 'bignote' }, lbl.main),
        h('div', { class: 'subnote' }, lbl.sub));
    };
    return KS.roundGame(root, {
      prog: 'find',
      levels: LEVELS,
      intro: 'L\'app ti dice una nota, tu la premi. Più ne trovi in 60 secondi, meglio è.',
      pool: (lvl) => {
        const [lo] = KS.keyboard.range();
        return LEVELS[lvl].pcs.map((pc) => lo + 12 + pc);
      },
      show,
    });
  },
};

KS.screens.readnote = {
  title: 'Leggi la nota',
  mount(root) {
    const { h } = KS.ui;
    const range = (a, b, pcs) => { const out = []; for (let m = a; m <= b; m++) if (pcs.includes(m % 12)) out.push(m); return out; };
    const LEVELS = {
      1: { name: 'Violino: Do – Sol', clef: 'treble', notes: [60, 62, 64, 65, 67] },
      2: { name: 'Violino: un\'ottava', clef: 'treble', notes: range(60, 72, WHITE) },
      3: { name: 'Violino: tagli in alto e in basso', clef: 'treble', notes: range(57, 81, WHITE) },
      4: { name: 'Basso: mano sinistra', clef: 'bass', notes: range(43, 60, WHITE) },
      5: { name: 'Violino con i diesis ♯', clef: 'treble', notes: range(60, 72, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) },
    };
    let lvlNow = 1;
    const show = (target, card) => {
      const lvl = LEVELS[lvlNow];
      card.replaceChildren(
        h('div', { class: 'ask' }, 'Che nota è? Suonala'),
        h('div', { class: 'staffcard', html: KS.staff.svg(target, lvl.clef) }),
        h('div', { class: 'subnote reveal' }, '?'));
    };
    show.reveal = (target, card) => {
      const r = card.querySelector('.reveal');
      if (r) { r.textContent = KS.notes.short(target); r.style.color = 'var(--good)'; }
    };
    return KS.roundGame(root, {
      prog: 'read',
      levels: LEVELS,
      intro: 'Guarda la nota sul pentagramma e suonala. Se sbagli due volte, il tasto si illumina.',
      pool: (lvl) => { lvlNow = lvl; return LEVELS[lvl].notes; },
      show,
      levelUp: 12,
    });
  },
};
