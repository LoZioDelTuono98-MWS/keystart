// "Giri": giri di accordi inclusi + quelli della band, da suonare aspettando o a tempo.

KS.screens.progs = {
  title: 'Giri',
  mount(root) {
    const { h } = KS.ui;
    const item = (p, mine) => h('button', { class: 'item', onclick: () => KS.app.go('progplay', { id: p.id }) },
      h('b', null, p.name),
      h('small', null, mine ? p.chords : p.info),
      h('span', { class: 'side' },
        mine ? h('span', { class: 'del', onclick: (e) => { e.stopPropagation(); KS.app.go('progedit', { id: p.id }); } }, 'Modifica') : '▶'));

    function draw() {
      root.replaceChildren();
      root.classList.add('enter');
      const mine = KS.library.progs();
      root.append(
        h('div', { class: 'section-title' }, 'I giri della band'),
        h('button', { class: 'add', onclick: () => KS.app.go('progedit', {}) }, '＋ Scrivi un giro (es. Am F C G)'),
        mine.length ? h('div', { class: 'list' }, ...mine.map((p) => item(p, true))) : null,
        h('div', { class: 'section-title' }, 'Giri per allenarsi'),
        h('div', { class: 'list' }, ...KS.progressions.list().map((p) => item(p, false))));
    }
    draw();
  },
};

KS.screens.progedit = {
  title: 'Il tuo giro',
  mount(root, { id }) {
    const { h } = KS.ui;
    const existing = id ? KS.library.progs().find((p) => p.id === id) : null;
    const data = existing ? { ...existing } : { name: '', chords: '', beats: 4, bpm: 80 };

    const name = h('input', { class: 'input', placeholder: 'Nome (es. Ritornello di …)', value: data.name });
    const chords = h('textarea', { class: 'input', placeholder: 'Accordi separati da spazi:\nAm F C G\noppure\nLam Fa Do Sol' });
    chords.value = data.chords;
    const preview = h('div', { class: 'prog-strip' });
    const err = h('div', { class: 'hint-err' });
    const bpmLbl = h('span', null, `${data.bpm} BPM`);
    const bpm = h('input', { class: 'slider', type: 'range', min: 40, max: 160, step: 2, value: data.bpm,
      oninput: () => { data.bpm = +bpm.value; bpmLbl.textContent = `${data.bpm} BPM`; } });

    function refresh() {
      const parsed = KS.notes.parseProgression(chords.value);
      preview.replaceChildren(...parsed.map((x) => h('span', { class: 'pchip' + (x.chord ? '' : ' err') },
        x.chord ? KS.notes.chordLabel(x.chord).main : x.tok)));
      const bad = parsed.filter((x) => !x.chord).map((x) => x.tok);
      err.textContent = bad.length ? `Non capisco: ${bad.join(', ')}` : '';
      return parsed;
    }
    chords.addEventListener('input', refresh);

    function save() {
      const parsed = refresh();
      if (!parsed.length || parsed.some((x) => !x.chord)) { err.textContent = err.textContent || 'Scrivi almeno un accordo.'; return; }
      data.name = name.value.trim() || 'Giro senza nome';
      data.chords = parsed.map((x) => x.tok).join(' ');
      if (existing) KS.library.updateProg(data); else KS.library.addProg(data);
      KS.app.goBack();
    }

    root.append(
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Nome'), name),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Accordi'), chords, preview, err,
        h('p', { class: 'muted small' }, 'Puoi scrivere in Do-Re-Mi (Lam, Sol7, Sib) o in lettere (Am, G7, Bb). Valgono anche m7, maj7, sus4, dim.')),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Battiti per accordo'),
        KS.ui.seg([[1, '1'], [2, '2'], [4, '4'], [8, '8']], data.beats, (v) => { data.beats = v; })),
      h('div', { class: 'field' }, h('div', { class: 'label' }, 'Velocità'), bpmLbl, bpm),
      h('div', { class: 'row stretch' },
        existing ? KS.ui.confirmBtn('Elimina', () => { KS.library.removeProg(existing.id); KS.app.goBack(); }, 'ghost danger') : null,
        h('button', { class: 'btn', onclick: save }, 'Salva')));
    refresh();
  },
};

KS.screens.progplay = {
  title: 'Giro',
  mount(root, { id }) {
    const { h, flash } = KS.ui;
    const prog = KS.progressions.get(id);
    if (!prog) { root.append(h('p', null, 'Giro non trovato.')); return; }
    document.getElementById('title').textContent = prog.name;
    const chords = KS.notes.parseProgression(prog.chords).filter((x) => x.chord).map((x) => x.chord);
    let mode = 'wait';
    let bpm = prog.bpm || 80;
    const beatsPer = prog.beats || 4;
    let idx = 0;
    let loops = 0;
    let running = false;
    let timer = null;
    let voicings = [];
    let hitThis = false;
    let solved = false;
    let card = null;
    let off = null;

    // rivolti calcolati una volta per tutto il giro, ognuno vicino al precedente
    let prev = null;
    voicings = chords.map((c) => (prev = KS.notes.voicing(c, prev)));

    const strip = h('div', { class: 'prog-strip' }, ...chords.map((c) => h('span', { class: 'pchip' }, KS.notes.chordLabel(c).main)));
    const area = h('div');
    const beats = h('div', { class: 'beats' }, ...Array.from({ length: Math.min(beatsPer, 8) }, (_, i) => h('span', { class: 'beat' + (i === 0 ? ' one' : '') })));
    const info = h('p', { class: 'progress-txt' }, '');
    const startBtn = h('button', { class: 'go', onclick: toggle }, 'VIA!');
    const bpmLbl = h('span', { class: 'muted small' }, `${bpm} BPM`);
    const bpmSlider = h('input', { class: 'slider', type: 'range', min: 40, max: 160, step: 2, value: bpm,
      oninput: () => { bpm = +bpmSlider.value; bpmLbl.textContent = `${bpm} BPM`; } });
    const tempoBox = h('div', { class: 'field', hidden: true }, bpmLbl, bpmSlider);

    root.append(
      KS.ui.seg([['wait', 'Aspetta me'], ['tempo', 'A tempo']], mode, (v) => { mode = v; tempoBox.hidden = v !== 'tempo'; beats.style.visibility = v === 'tempo' ? 'visible' : 'hidden'; stop(); show(0); }),
      tempoBox, strip, area, beats, info, startBtn);
    beats.style.visibility = 'hidden';

    function show(i) {
      idx = i;
      solved = false;
      hitThis = false;
      card = KS.chordCard(chords[i]);
      area.replaceChildren(card);
      [...strip.children].forEach((c, k) => c.classList.toggle('now', k === i));
      KS.keyboard.setTargets(KS.settings.get('showChordKeys') ? voicings[i] : []);
      card.markHeld(KS.input.held());
    }

    function markStrip(i, ok) {
      const c = strip.children[i];
      c.classList.remove('ok', 'miss');
      c.classList.add(ok ? 'ok' : 'miss');
    }

    function onInput() {
      if (!card) return;
      const held = KS.input.held();
      card.markHeld(held);
      if (!running) return;
      const r = KS.chordCheck(chords[idx], held);
      if (mode === 'wait') {
        if (r === 'ok' && !solved) {
          solved = true;
          KS.stats.hit();
          flash(card, 'good');
          markStrip(idx, true);
          setTimeout(() => {
            if (!running) return;
            if (idx + 1 >= chords.length) { loops++; info.textContent = `Giri completati: ${loops}`; [...strip.children].forEach((c) => c.classList.remove('ok', 'miss')); }
            show((idx + 1) % chords.length);
          }, 350);
        } else if (r === 'wrong') flash(card, 'bad');
      } else if (r === 'ok' && !hitThis) {
        hitThis = true;
        KS.stats.hit();
        flash(card, 'good');
      }
    }

    function startTempo() {
      let beat = -4; // 4 battiti di attacco
      let score = 0;
      info.textContent = 'Pronti…';
      const tick = () => {
        const dots = beats.children;
        if (beat < 0) {
          [...dots].forEach((d, k) => d.classList.toggle('on', k === beat + 4));
          KS.audio.click(beat === -4);
          info.textContent = `${-beat}…`;
        } else {
          const pos = beat % beatsPer;
          const ci = Math.floor(beat / beatsPer) % chords.length;
          if (pos === 0) {
            if (beat > 0) {
              const prevIdx = (ci - 1 + chords.length) % chords.length;
              markStrip(prevIdx, hitThis);
              if (hitThis) score++;
              if (ci === 0) {
                loops++;
                info.textContent = `Giro ${loops}: ${score}/${chords.length} accordi presi`;
                score = 0;
                [...strip.children].forEach((c) => c.classList.remove('ok', 'miss'));
              }
            } else info.textContent = 'Suona!';
            show(ci);
            if (KS.chordCheck(chords[ci], KS.input.held()) === 'ok') hitThis = true;
          }
          [...dots].forEach((d, k) => d.classList.toggle('on', k === pos % dots.length));
          KS.audio.click(pos === 0);
        }
        beat++;
        timer = setTimeout(tick, 60000 / bpm);
      };
      tick();
    }

    function toggle() { if (running) stop(); else start(); }
    function start() {
      running = true;
      loops = 0;
      startBtn.textContent = 'Stop';
      [...strip.children].forEach((c) => c.classList.remove('ok', 'miss'));
      show(0);
      info.textContent = mode === 'wait' ? 'Suona l\'accordo: passo al prossimo quando è giusto.' : '';
      if (mode === 'tempo') startTempo();
    }
    function stop() {
      running = false;
      clearTimeout(timer);
      startBtn.textContent = 'VIA!';
      [...beats.children].forEach((d) => d.classList.remove('on'));
    }

    show(0);
    off = KS.input.on(onInput);
    return () => { stop(); off(); };
  },
};
