KS.screens.settings = {
  title: 'Impostazioni',
  mount(root) {
    const { h } = KS.app;
    const S = KS.settings;

    const choice = (label, key, options) =>
      h('div', { class: 'set' },
        h('div', { class: 'set-label' }, label),
        h('div', { class: 'seg' },
          ...options.map(([val, txt]) =>
            h('button', {
              class: S.get(key) === val ? 'sel' : '',
              onclick: () => { S.set(key, val); redraw(); },
            }, txt))));

    function redraw() {
      root.innerHTML = '';
      root.append(
        choice('Nomi delle note', 'names', [['it', 'Do Re Mi'], ['en', 'C D E'], ['both', 'Entrambi']]),
        choice("Suono dell'app", 'sound', [[true, 'Acceso'], [false, 'Spento']]),
        h('p', { class: 'muted small' }, 'Spegnilo se la tastiera suona già con Cantabile o un altro programma.'),
        choice('Nomi sui tasti', 'keyLabels', [[true, 'Sì'], [false, 'No']]),
        choice('Nota giusta in qualsiasi ottava', 'anyOctave', [[true, 'Sì'], [false, 'No, ottava esatta']]),
        h('button', {
          class: 'ghost danger',
          onclick: () => { KS.progress.reset(); redraw(); },
        }, 'Azzera i progressi'),
        h('p', { class: 'muted small' }, 'Tastiera del computer: A S D F G H J K = tasti bianchi, W E T Y U = neri, Z / X = ottava giù / su.'));
    }
    redraw();
  },
};
