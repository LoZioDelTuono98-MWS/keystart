KS.screens.free = {
  title: 'Suona libero',
  mount(root) {
    const { h } = KS.app;
    const big = h('div', { class: 'bignote idle' }, '?');
    const sub = h('div', { class: 'subnote' }, 'Premi un tasto');
    const chord = h('div', { class: 'chord' }, '');
    const card = h('div', { class: 'notecard' }, big, sub);
    root.append(card, chord);

    function update() {
      const held = KS.input.held().sort((a, b) => a - b);
      if (!held.length) return; // l'ultima nota resta visibile
      const last = held[held.length - 1];
      const lbl = KS.notes.label(last);
      big.classList.remove('idle');
      big.textContent = held.length > 1 ? held.map((n) => KS.notes.label(n).main).join(' ') : lbl.main;
      big.classList.toggle('many', held.length > 1);
      sub.textContent = held.length > 1 ? (lbl.sub ? held.map((n) => KS.notes.label(n).sub).join(' ') : '') : lbl.sub;
      card.style.setProperty('--c', KS.notes.color(last));
      card.classList.remove('pop');
      void card.offsetWidth;
      card.classList.add('pop');
      const name = KS.notes.chordName(held);
      chord.textContent = name ? '✨ Accordo: ' + name : '';
    }

    return KS.input.on((ev) => { if (ev.type === 'on') update(); });
  },
};
