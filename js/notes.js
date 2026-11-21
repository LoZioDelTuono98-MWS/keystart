// Nomi delle note, colori e riconoscimento accordi.
KS.notes = (() => {
  const IT = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  const EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  // Un colore fisso per ogni nota (i diesis usano il colore della nota sotto).
  const COLORS = ['#ff5a5a', '#ff5a5a', '#ff9f2e', '#ff9f2e', '#ffd93d', '#5fd35f', '#5fd35f',
                  '#2ec8c8', '#2ec8c8', '#4d8dff', '#4d8dff', '#b46dff'];
  const BLACK = [1, 3, 6, 8, 10];

  const pc = (m) => ((m % 12) + 12) % 12;
  const isBlack = (m) => BLACK.includes(pc(m));
  const color = (m) => COLORS[pc(m)];
  const octave = (m) => Math.floor(m / 12) - 1; // MIDI 60 = Do4

  // Nome principale + nome secondario secondo l'impostazione scelta.
  function label(m) {
    const mode = KS.settings.get('names');
    const i = pc(m);
    if (mode === 'it') return { main: IT[i], sub: '' };
    if (mode === 'en') return { main: EN[i], sub: '' };
    return { main: IT[i], sub: EN[i] };
  }

  function short(m) {
    const l = label(m);
    return l.sub ? `${l.main} · ${l.sub}` : l.main;
  }

  // "C#4" / "E4" -> numero MIDI
  function parse(str) {
    const m = /^([A-G])(#?)(-?\d)$/.exec(str.trim());
    if (!m) throw new Error('Nota non valida: ' + str);
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return (parseInt(m[3], 10) + 1) * 12 + base + (m[2] ? 1 : 0);
  }

  // Riconosce triadi maggiori e minori (anche in rivolto).
  function chordName(notes) {
    const set = [...new Set(notes.map(pc))];
    if (set.length !== 3) return null;
    for (const root of set) {
      const rel = set.map((n) => (n - root + 12) % 12).sort((a, b) => a - b).join(',');
      const lbl = label(root);
      const nm = lbl.sub ? `${lbl.main} (${lbl.sub})` : lbl.main;
      if (rel === '0,4,7') return `${nm} maggiore`;
      if (rel === '0,3,7') return `${nm} minore`;
    }
    return null;
  }

  return { IT, EN, pc, isBlack, color, octave, label, short, parse, chordName };
})();
