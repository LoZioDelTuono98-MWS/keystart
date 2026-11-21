// Lista canzoni + lettore in modalità "aspetta il tasto giusto".
KS.screens.songs = {
  title: 'Canzoni',
  mount(root) {
    const { h, go } = KS.app;
    const done = KS.progress.get('songsDone') || {};
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
    root.append(
      h('div', { class: 'songlist' },
        ...KS.songs.list().map((s) =>
          h('button', { class: 'song', onclick: () => go('player', { id: s.id }) },
            h('span', { class: 'song-title' }, (done[s.id] ? '✅ ' : '') + s.title),
            h('span', { class: 'song-info' }, s.info),
            h('span', { class: 'song-stars', 'aria-label': `Difficoltà ${s.level} su 3` }, stars(s.level))))),
      h('p', { class: 'tip' }, 'Presto: carica i tuoi file MIDI e le sequenze di accordi della band.'));
  },
};

KS.screens.player = {
  title: 'Suona',
  mount(root, { id }) {
    const { h } = KS.app;
    const song = KS.songs.get(id);
    const seq = KS.songs.parse(song);
    let i = 0;
    let errors = 0;
    let demoTimers = [];
    let started = Date.now();

    const [lo, hi] = KS.app.rangeFor(seq.map((s) => s.note));
    KS.keyboard.setRange(lo, hi);
    KS.keyboard.lock(true);

    const titleEl = h('div', { class: 'song-head' }, song.title);
    const bar = h('div', { class: 'bar-fill' });
    const upcoming = h('div', { class: 'upcoming' });
    const bigEl = h('div', { class: 'bignote' });
    const subEl = h('div', { class: 'subnote' });
    const card = h('div', { class: 'notecard' }, bigEl, subEl);
    const listenBtn = h('button', { class: 'ghost', onclick: demo }, '👂 Ascolta');
    const restartBtn = h('button', { class: 'ghost', onclick: restart }, '↺ Da capo');
    root.append(titleEl, h('div', { class: 'bar' }, bar), card, upcoming, h('div', { class: 'row' }, listenBtn, restartBtn));

    function show() {
      bar.style.width = `${(i / seq.length) * 100}%`;
      if (i >= seq.length) return finish();
      const t = seq[i].note;
      const lbl = KS.notes.label(t);
      bigEl.textContent = lbl.main;
      subEl.textContent = lbl.sub;
      card.style.setProperty('--c', KS.notes.color(t));
      KS.keyboard.setTargets([t]);
      upcoming.innerHTML = '';
      seq.slice(i + 1, i + 6).forEach((s, k) => {
        const b = h('span', { class: 'bubble' }, KS.notes.label(s.note).main);
        b.style.setProperty('--c', KS.notes.color(s.note));
        b.style.opacity = String(1 - k * 0.16);
        upcoming.appendChild(b);
      });
    }

    function flash(cls) {
      card.classList.remove('good', 'bad');
      void card.offsetWidth;
      card.classList.add(cls);
    }

    function onNote(ev) {
      if (ev.type !== 'on' || i >= seq.length || demoTimers.length) return;
      if (KS.app.matches(ev.note, seq[i].note)) {
        i++;
        flash('good');
        show();
      } else {
        errors++;
        flash('bad');
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
      card.style.setProperty('--c', '#5fd35f');
      upcoming.innerHTML = '';
    }

    function restart() {
      stopDemo();
      i = 0; errors = 0; started = Date.now();
      card.replaceChildren(bigEl, subEl);
      show();
    }

    // Suona la canzone da sola, così la impari anche a orecchio.
    function demo() {
      if (demoTimers.length) { stopDemo(); return; }
      listenBtn.textContent = '⏹ Stop';
      const beat = 60000 / song.bpm;
      let t = 0;
      seq.forEach((s) => {
        const startAt = t;
        demoTimers.push(setTimeout(() => {
          KS.keyboard.setTargets([s.note]);
          KS.audio.noteOn(s.note, 90);
        }, startAt));
        demoTimers.push(setTimeout(() => KS.audio.noteOff(s.note), startAt + s.dur * beat * 0.9));
        t += s.dur * beat;
      });
      demoTimers.push(setTimeout(() => { stopDemo(); }, t + 200));
    }

    function stopDemo() {
      demoTimers.forEach(clearTimeout);
      demoTimers = [];
      seq.forEach((s) => KS.audio.noteOff(s.note));
      listenBtn.textContent = '👂 Ascolta';
      if (i < seq.length) KS.keyboard.setTargets([seq[i].note]);
    }

    show();
    const off = KS.input.on(onNote);
    return () => { off(); stopDemo(); KS.keyboard.lock(false); };
  },
};
