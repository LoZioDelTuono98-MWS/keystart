// Canzoni: incluse (pubblico dominio) + importate da file MIDI. Lettore in modalità "aspetta il tasto giusto".

KS.screens.songs = {
  title: 'Canzoni',
  mount(root) {
    const { h } = KS.ui;
    const done = KS.progress.get('songsDone') || {};
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
    const file = h('input', { type: 'file', accept: '.mid,.midi,audio/midi,audio/x-midi', hidden: true });
    const err = h('div', { class: 'hint-err' });

    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      try {
        const tracks = KS.midifile.parse(await f.arrayBuffer());
        if (!tracks.length) throw new Error('Nel file non ci sono note da suonare.');
        KS.app.go('import', { tracks, fileName: f.name.replace(/\.(mid|midi)$/i, '') });
      } catch (e) {
        err.textContent = e.message || 'Non riesco a leggere questo file.';
      }
      file.value = '';
    });

    function draw() {
      root.replaceChildren();
      root.classList.add('enter');
      const mine = KS.library.songs();
      root.append(
        h('div', { class: 'section-title' }, 'Le tue canzoni'),
        h('button', { class: 'add', onclick: () => file.click() }, '＋ Carica un file MIDI (.mid)'),
        err, file,
        mine.length ? h('div', { class: 'list' }, ...mine.map((s) =>
          h('div', { class: 'item', role: 'button', tabindex: 0, onclick: () => KS.app.go('player', { id: s.id }) },
            h('b', null, (done[s.id] ? '✅ ' : '') + s.title),
            h('small', null, `${s.steps.length} passi · dal tuo file`),
            h('span', { class: 'side' }, KS.ui.confirmBtn('Elimina', () => { KS.library.removeSong(s.id); draw(); }))))) :
          h('p', { class: 'muted small' }, 'I file che carichi restano solo su questo dispositivo.'),
        h('div', { class: 'section-title' }, 'Incluse'),
        h('div', { class: 'list' }, ...KS.songs.list().map((s) =>
          h('button', { class: 'item', onclick: () => KS.app.go('player', { id: s.id }) },
            h('b', null, (done[s.id] ? '✅ ' : '') + s.title),
            h('small', null, s.info),
            h('span', { class: 'side', 'aria-label': `Difficoltà ${s.level} su 3` }, stars(s.level))))));
    }
    draw();
  },
};

KS.screens.import = {
  title: 'Importa MIDI',
  mount(root, { tracks, fileName }) {
    const { h } = KS.ui;
    if (!tracks) { setTimeout(KS.app.goBack); return; }
    // di solito la melodia è la traccia più acuta con abbastanza note
    const ranked = tracks.slice().sort((a, b) => (b.notes.length > 20) - (a.notes.length > 20) || b.avg - a.avg);
    let chosen = ranked[0].index;
    let melody = true;
    const title = h('input', { class: 'input', value: fileName || 'Canzone' });
    const list = h('div', { class: 'list' });
    const err = h('div', { class: 'hint-err' });
    const noteName = (m) => KS.notes.label(m).main + KS.notes.octave(m);

    function drawTracks() {
      list.replaceChildren(...tracks.map((t) =>
        h('button', { class: 'item' + (t.index === chosen ? ' ghost on' : ''), onclick: () => { chosen = t.index; drawTracks(); } },
          h('b', null, (t.index === chosen ? '● ' : '○ ') + t.name),
          h('small', null, `${t.notes.length} note · da ${noteName(t.min)} a ${noteName(t.max)}`),
          h('span', { class: 'side' }, h('span', {
            class: 'del',
            onclick: (e) => { e.stopPropagation(); preview(t); },
          }, '👂')))));
    }

    let demo = [];
    function preview(t) {
      demo.forEach(clearTimeout);
      demo = [];
      const steps = KS.midifile.toSteps(t.notes, melody).slice(0, 24);
      steps.forEach((s) => {
        demo.push(setTimeout(() => s.notes.forEach((n) => KS.audio.noteOn(n, 85)), s.t));
        demo.push(setTimeout(() => s.notes.forEach((n) => KS.audio.noteOff(n)), s.t + Math.min(s.d, 600) * 0.9));
      });
    }

    function save() {
      const t = tracks.find((x) => x.index === chosen);
      const steps = KS.midifile.toSteps(t.notes, melody);
      if (steps.length > 3000) steps.length = 3000;
      try {
        const song = KS.library.addSong({ title: title.value.trim() || 'Canzone', steps, source: 'midi' });
        KS.app.go('player', { id: song.id }, { replace: true });
      } catch (e) {
        err.textContent = e.message;
      }
    }

    drawTracks();
    root.append(
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Nome'), title),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Quale parte vuoi suonare?'),
        h('p', { class: 'muted small' }, 'Tocca 👂 per sentire l\'inizio di ogni traccia.'), list),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Note da suonare'),
        KS.ui.seg([[true, 'Solo melodia'], [false, 'Anche gli accordi']], melody, (v) => { melody = v; })),
      err,
      h('button', { class: 'go', onclick: save }, 'Salva e suona'));
    return () => demo.forEach(clearTimeout);
  },
};

KS.screens.player = {
  title: 'Suona',
  mount(root, { id }) {
    const { h, flash } = KS.ui;
    const song = KS.songs.get(id);
    if (!song) { root.append(h('p', null, 'Canzone non trovata.')); return; }
    document.getElementById('title').textContent = song.title;
    const seq = KS.songs.steps(song);
    let i = 0;
    let pressed = new Set();
    let errors = 0;
    let demoTimers = [];
    let started = Date.now();
    let speed = 1;

    KS.keyboard.fitTo(seq.flatMap((s) => s.notes));
    KS.keyboard.lock(true);

    const bar = h('div', { class: 'bar-fill' });
    const counter = h('span', { class: 'muted small' });
    const upcoming = h('div', { class: 'upcoming' });
    const bigEl = h('div', { class: 'bignote' });
    const subEl = h('div', { class: 'subnote' });
    const card = h('div', { class: 'notecard' }, bigEl, subEl);
    const listenBtn = h('button', { class: 'ghost', onclick: demo }, '👂 Ascolta');
    root.append(
      h('div', { class: 'bar' }, bar), counter, card, upcoming,
      h('div', { class: 'row' }, listenBtn,
        h('button', { class: 'ghost', onclick: () => jump(Math.max(0, i - 8)) }, '⏪'),
        h('button', { class: 'ghost', onclick: restart }, '↺ Da capo')),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Velocità di ascolto'),
        KS.ui.seg([[0.5, '50%'], [0.75, '75%'], [1, '100%']], speed, (v) => { speed = v; })));

    const names = (notes) => notes.map((n) => KS.notes.label(n).main).join(' ');

    function show() {
      bar.style.width = `${(i / seq.length) * 100}%`;
      counter.textContent = `${Math.min(i + 1, seq.length)} / ${seq.length}`;
      if (i >= seq.length) return finish();
      const st = seq[i];
      const top = st.notes[st.notes.length - 1];
      bigEl.textContent = names(st.notes);
      bigEl.classList.toggle('many', st.notes.length > 1);
      subEl.textContent = st.notes.length > 1 ? 'tutte insieme' : KS.notes.label(top).sub;
      card.style.setProperty('--c', KS.notes.color(top));
      KS.keyboard.setTargets(st.notes);
      upcoming.replaceChildren(...seq.slice(i + 1, i + 6).map((s, k) => {
        const b = h('span', { class: 'bubble' }, names(s.notes));
        b.style.setProperty('--c', KS.notes.color(s.notes[s.notes.length - 1]));
        b.style.opacity = String(1 - k * 0.16);
        return b;
      }));
    }

    function onNote(ev) {
      if (ev.type !== 'on' || i >= seq.length || demoTimers.length) return;
      const st = seq[i];
      const hit = st.notes.find((n) => KS.ui.matches(ev.note, n));
      if (hit == null) { errors++; flash(card, 'bad'); return; }
      pressed.add(hit);
      if (st.notes.every((n) => pressed.has(n))) {
        i++;
        pressed = new Set();
        KS.stats.hit();
        flash(card, 'good');
        show();
      }
    }

    function finish() {
      KS.keyboard.setTargets([]);
      const secs = Math.round((Date.now() - started) / 1000);
      const doneMap = KS.progress.get('songsDone') || {};
      doneMap[song.id] = true;
      KS.progress.set('songsDone', doneMap);
      KS.audio.cue(true);
      card.replaceChildren(
        h('div', { class: 'result-emoji' }, errors === 0 ? '🏆' : '🎉'),
        h('div', { class: 'result-score' }, 'Finita!'),
        h('p', null, errors === 0 ? 'Zero errori. Mostro!' : `${errors} errori · ${secs} secondi`));
      card.style.setProperty('--c', 'var(--good)');
      upcoming.replaceChildren();
    }

    function jump(n) {
      stopDemo();
      i = n;
      pressed = new Set();
      card.replaceChildren(bigEl, subEl);
      show();
    }
    function restart() { errors = 0; started = Date.now(); jump(0); }

    // Suona da qui in avanti, così la impari anche a orecchio.
    function demo() {
      if (demoTimers.length) { stopDemo(); return; }
      listenBtn.textContent = '⏹ Stop';
      const from = Math.min(i, seq.length - 1);
      const part = seq.slice(from, from + 40);
      const t0 = part[0].t;
      part.forEach((s, k) => {
        const at = (s.t - t0) / speed;
        demoTimers.push(setTimeout(() => {
          KS.keyboard.setTargets(s.notes);
          s.notes.forEach((n) => KS.audio.noteOn(n, 90));
        }, at));
        demoTimers.push(setTimeout(() => s.notes.forEach((n) => KS.audio.noteOff(n)), at + (s.d / speed) * 0.9));
        if (k === part.length - 1) demoTimers.push(setTimeout(stopDemo, at + s.d / speed + 200));
      });
    }

    function stopDemo() {
      demoTimers.forEach(clearTimeout);
      const was = demoTimers.length;
      demoTimers = [];
      seq.forEach((s) => s.notes.forEach((n) => KS.audio.noteOff(n)));
      listenBtn.textContent = '👂 Ascolta';
      if (was && i < seq.length) KS.keyboard.setTargets(seq[i].notes);
    }

    show();
    const off = KS.input.on(onNote);
    return () => { off(); stopDemo(); KS.keyboard.lock(false); };
  },
};
