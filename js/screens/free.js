KS.screens.free = {
  title: 'Suona libero',
  mount(root) {
    const { h } = KS.ui;
    const big = h('div', { class: 'bignote idle' }, '?');
    const sub = h('div', { class: 'subnote' }, 'Premi un tasto');
    const card = h('div', { class: 'notecard' }, big, sub);
    const chord = h('div', { class: 'chord' }, '');
    root.append(card, chord);

    function update() {
      const held = KS.input.held().sort((a, b) => a - b);
      if (!held.length) return; // l'ultima nota resta visibile
      const last = held[held.length - 1];
      const lbl = KS.notes.label(last);
      big.classList.remove('idle');
      big.classList.toggle('many', held.length > 1);
      big.textContent = held.length > 1 ? held.map((n) => KS.notes.label(n).main).join(' ') : lbl.main;
      sub.textContent = held.length > 1 ? (lbl.sub ? held.map((n) => KS.notes.label(n).sub).join(' ') : '') : lbl.sub;
      card.style.setProperty('--c', KS.notes.color(last));
      KS.ui.flash(card, 'pop');
      const name = KS.notes.chordName(held);
      chord.textContent = name ? '✨ ' + name : '';
    }

    return KS.input.on((ev) => { if (ev.type === 'on') update(); });
  },
};
