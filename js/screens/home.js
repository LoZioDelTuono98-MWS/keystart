KS.screens = KS.screens || {};

KS.screens.home = {
  title: 'KeyStart',
  mount(root) {
    const { h, go } = KS.app;
    const tile = (emoji, name, desc, target, cls) =>
      h('button', { class: 'tile ' + (cls || ''), onclick: () => go(target) },
        h('span', { class: 'tile-emoji' }, emoji),
        h('span', { class: 'tile-name' }, name),
        h('span', { class: 'tile-desc' }, desc));

    root.append(
      h('p', { class: 'hello' }, 'Cosa facciamo oggi?'),
      h('div', { class: 'tiles' },
        tile('🎹', 'Suona libero', 'Premi un tasto e vedi che nota è', 'free', 't1'),
        tile('🎯', 'Trova la nota', 'Gioco da 60 secondi', 'findnote', 't2'),
        tile('🎵', 'Canzoni', 'La canzone ti aspetta', 'songs', 't3'),
        tile('⚙️', 'Impostazioni', 'Nomi delle note, suono…', 'settings', 't4')),
      h('p', { class: 'tip' }, 'Niente tastiera MIDI? Tocca i tasti qui sotto oppure usa A S D F G H J K sul computer.'));
  },
};
