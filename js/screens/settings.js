KS.screens.settings = {
  title: 'Impostazioni',
  mount(root) {
    const { h, seg } = KS.ui;
    const S = KS.settings;
    const sec = (label, ...kids) => h('div', { class: 'sec' }, h('div', { class: 'label' }, label), ...kids);
    const set = (key) => (v) => S.set(key, v);

    function swatches() {
      const dark = KS.theme.isDark();
      const wrap = h('div', { class: 'swatches' });
      const draw = () => wrap.replaceChildren(...KS.theme.THEMES.map((t) => {
        const i = h('i');
        i.style.background = `linear-gradient(135deg, ${dark ? t.cd : t.c} 50%, ${dark ? t.cd2 : t.c2} 50%)`;
        i.style.color = dark ? t.cd : t.c;
        return h('button', { class: 'sw' + (S.get('theme') === t.id ? ' on' : ''), onclick: () => { S.set('theme', t.id); draw(); } }, i, t.name);
      }));
      draw();
      return wrap;
    }

    function bluetooth() {
      if (!KS.input.isApp) return null;
      const list = h('div', { class: 'devlist' });
      const msg = h('p', { class: 'muted small' }, 'Accendi il Bluetooth della tastiera, poi tocca Cerca.');
      const btn = h('button', { class: 'btn', onclick: scan }, '🔍 Cerca tastiere Bluetooth');
      async function scan() {
        btn.disabled = true;
        btn.textContent = 'Cerco… (10 secondi)';
        list.replaceChildren();
        try {
          const res = await KS.input.ble.scan();
          const devs = res.devices || [];
          msg.textContent = devs.length ? 'Tocca la tua tastiera per collegarla:' : 'Nessuna tastiera trovata. È accesa e in modalità Bluetooth?';
          list.replaceChildren(...devs.map((d) => h('button', {
            class: 'item',
            onclick: async () => {
              msg.textContent = `Collego ${d.name}…`;
              try { await KS.input.ble.connect(d.address); msg.textContent = `✅ ${d.name} collegata!`; }
              catch (e) { msg.textContent = 'Non riesco a collegarla: ' + (e.message || e); }
            },
          }, h('b', null, d.name || 'Dispositivo MIDI'), h('small', null, d.address))));
        } catch (e) {
          msg.textContent = 'Errore: ' + (e.message || e);
        }
        btn.disabled = false;
        btn.textContent = '🔍 Cerca tastiere Bluetooth';
      }
      return sec('Tastiera Bluetooth', msg, btn, list);
    }

    root.classList.add('enter');
    root.append(
      sec('Tema', seg([['auto', 'Auto'], ['light', 'Chiaro'], ['dark', 'Scuro']], S.get('mode'), (v) => { S.set('mode', v); KS.app.go('settings', {}, { replace: true }); })),
      sec('Colore', swatches()),
      sec('Nomi delle note', seg([['it', 'Do Re Mi'], ['en', 'C D E'], ['both', 'Entrambi']], S.get('names'), set('names'))),
      bluetooth(),
      sec("Suono dell'app", seg([[true, 'Acceso'], [false, 'Spento']], S.get('sound'), set('sound')),
        h('p', { class: 'muted small', style: 'margin-top:6px' }, 'Spegnilo se la tastiera suona già con Cantabile o un altro programma.')),
      sec('Nomi sui tasti', seg([[true, 'Sì'], [false, 'No']], S.get('keyLabels'), set('keyLabels'))),
      sec('Nota giusta in qualsiasi ottava', seg([[true, 'Sì'], [false, 'Solo ottava esatta']], S.get('anyOctave'), set('anyOctave'))),
      KS.ui.confirmBtn('Azzera i progressi', () => { KS.progress.reset(); KS.app.go('settings', {}, { replace: true }); }, 'ghost danger'),
      h('p', { class: 'muted small' }, 'Tastiera del computer: A S D F G H J K = tasti bianchi, W E T Y U = neri, Z / X = ottava giù / su.'),
      h('p', { class: 'muted small' }, 'Simboli musicali: font Bravura (SIL Open Font License).'));
  },
};
