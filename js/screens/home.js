KS.screens.home = {
  title: 'KeyStart',
  mount(root) {
    const { h } = KS.ui;
    const go = (s) => KS.app.go(s);
    const streak = KS.stats.streak();
    const hits = KS.stats.todayHits();
    const tile = (ic, name, desc, target, cls) =>
      h('button', { class: 'tile ' + (cls || ''), onclick: () => go(target) },
        h('span', { class: 'ic' }, ic), h('b', null, name), h('small', null, desc));

    root.classList.add('enter');
    root.append(
      h('div', { class: 'hero' },
        h('div', null,
          h('h2', null, 'Cosa suoniamo?'),
          h('p', { class: 'muted small' }, hits ? `Oggi: ${hits} note giuste` : 'Anche 5 minuti contano.')),
        streak ? h('div', { class: 'streak' }, h('b', null, `🔥 ${streak}`), h('span', null, streak === 1 ? 'GIORNO' : 'GIORNI')) : null),
      h('div', { class: 'tiles' },
        tile('🎹', 'Suona libero', 'Premi e scopri la nota', 'free'),
        tile('🎯', 'Trova la nota', 'Gioco da 60 secondi', 'findnote', 'a2'),
        tile('🎼', 'Leggi la nota', 'Il pentagramma, una nota alla volta', 'readnote'),
        tile('✋', 'Accordi', 'Impara a suonarli', 'chords', 'a2'),
        tile('🔁', 'Giri', 'Gli accordi della band, a tempo', 'progs'),
        tile('🎵', 'Canzoni', 'Ti aspettano. Anche i tuoi MIDI', 'songs', 'a2')));
  },
};
