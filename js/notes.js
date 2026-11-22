// Nomi delle note, colori, accordi.
KS.notes = (() => {
  const IT = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
  const EN = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const IT_FLAT = { 1: 'Re♭', 3: 'Mi♭', 6: 'Sol♭', 8: 'La♭', 10: 'Si♭' };
  const EN_FLAT = { 1: 'D♭', 3: 'E♭', 6: 'G♭', 8: 'A♭', 10: 'B♭' };
  // Un colore fisso per ogni nota (i diesis usano il colore della nota sotto).
  const COLORS = ['#ff5a5a', '#ff5a5a', '#ff9f2e', '#ff9f2e', '#ffd93d', '#5fd35f', '#5fd35f',
                  '#2ec8c8', '#2ec8c8', '#4d8dff', '#4d8dff', '#b46dff'];
  const BLACK = [1, 3, 6, 8, 10];

  const pc = (m) => ((m % 12) + 12) % 12;
  const isBlack = (m) => BLACK.includes(pc(m));
  const color = (m) => COLORS[pc(m)];
  const octave = (m) => Math.floor(m / 12) - 1; // MIDI 60 = Do4

  // Nome principale + secondario secondo l'impostazione. flat=true usa i bemolle (Si♭ invece di La♯).
  function label(m, flat) {
    const mode = KS.settings.get('names');
    const i = pc(m);
    const it = flat && IT_FLAT[i] ? IT_FLAT[i] : IT[i];
    const en = flat && EN_FLAT[i] ? EN_FLAT[i] : EN[i];
    if (mode === 'it') return { main: it, sub: '' };
    if (mode === 'en') return { main: en, sub: '' };
    return { main: it, sub: en };
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

  // ---------- Accordi ----------
  // tones = note dell'accordo, need = note obbligatorie (la quinta si può omettere nelle settime).
  const QUALITIES = {
    maj: { tones: [0, 4, 7], need: [0, 4, 7], it: '', en: '', word: 'maggiore' },
    min: { tones: [0, 3, 7], need: [0, 3, 7], it: 'm', en: 'm', word: 'minore' },
    '7': { tones: [0, 4, 7, 10], need: [0, 4, 10], it: '7', en: '7', word: 'settima' },
    maj7: { tones: [0, 4, 7, 11], need: [0, 4, 11], it: '7+', en: 'maj7', word: 'settima maggiore' },
    m7: { tones: [0, 3, 7, 10], need: [0, 3, 10], it: 'm7', en: 'm7', word: 'minore settima' },
    sus2: { tones: [0, 2, 7], need: [0, 2, 7], it: 'sus2', en: 'sus2', word: 'sus2' },
    sus4: { tones: [0, 5, 7], need: [0, 5, 7], it: 'sus4', en: 'sus4', word: 'sus4' },
    dim: { tones: [0, 3, 6], need: [0, 3, 6], it: 'dim', en: 'dim', word: 'diminuito' },
    aug: { tones: [0, 4, 8], need: [0, 4, 8], it: 'aug', en: 'aug', word: 'aumentato' },
    '5': { tones: [0, 7], need: [0, 7], it: '5', en: '5', word: 'power chord' },
  };
  const SUFFIX = [
    [/^(maj7|ma7|M7|7\+|Δ)$/, 'maj7'], [/^(m7|min7|-7)$/, 'm7'], [/^7$/, '7'],
    [/^(m|min|-)$/, 'min'], [/^(sus2)$/, 'sus2'], [/^(sus4|sus)$/, 'sus4'],
    [/^(dim|°|o)$/, 'dim'], [/^(aug|\+)$/, 'aug'], [/^5$/, '5'], [/^(maj|M)?$/, 'maj'],
  ];
  const ROOT_EN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
  const ROOT_IT = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

  // "Am", "F#7", "Lam", "Sol7", "Sib", "C/E" -> { root, q, flat, text } oppure null
  function parseChord(txt) {
    let s = txt.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
    if (!s) return null;
    s = s.split('/')[0];
    let root = null;
    let rest = '';
    const it = /^(do|re|mi|fa|sol|la|si)/i.exec(s);
    if (it) {
      root = ROOT_IT[it[1].toLowerCase()];
      rest = s.slice(it[1].length);
    } else if (/^[A-H]/.test(s)) {
      root = ROOT_EN[s[0]];
      rest = s.slice(1);
    } else return null;
    let flat = false;
    if (rest[0] === '#') { root += 1; rest = rest.slice(1); }
    else if (rest[0] === 'b') { root -= 1; flat = true; rest = rest.slice(1); }
    for (const [re, q] of SUFFIX) {
      if (re.test(rest)) return { root: pc(root), q, flat, text: txt.trim() };
    }
    return null;
  }

  // Divide una riga tipo "Am F C G" o "La- | Fa | Do | Sol" in accordi.
  function parseProgression(text) {
    const toks = text.split(/[\s,|;]+/).filter(Boolean);
    return toks.map((t) => ({ tok: t, chord: parseChord(t) }));
  }

  function chordLabel(ch) {
    const q = QUALITIES[ch.q];
    const names = KS.settings.get('names');
    const l = label(ch.root, ch.flat);
    const enName = (ch.flat && EN_FLAT[ch.root] ? EN_FLAT[ch.root] : EN[ch.root]) + q.en;
    const itName = l.main + q.it;
    if (names === 'en') return { main: enName, sub: '', word: q.word };
    if (names === 'it') return { main: itName, sub: '', word: q.word };
    return { main: itName, sub: enName, word: q.word };
  }

  const chordTones = (ch) => QUALITIES[ch.q].tones.map((i) => (ch.root + i) % 12);
  const chordNeed = (ch) => QUALITIES[ch.q].need.map((i) => (ch.root + i) % 12);

  // Sceglie il rivolto più vicino all'accordo precedente (mano destra, attorno al Do centrale).
  function voicing(ch, prev) {
    const tones = QUALITIES[ch.q].tones;
    const cands = [];
    for (let inv = 0; inv < tones.length; inv++) {
      const ordered = tones.slice(inv).concat(tones.slice(0, inv).map((t) => t + 12));
      for (let base = 52; base <= 67; base++) {
        if (pc(base) !== pc(ch.root + ordered[0])) continue;
        cands.push(ordered.map((t) => base + t - ordered[0]));
      }
    }
    const center = prev && prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 64;
    let best = cands[0];
    let bestD = Infinity;
    for (const c of cands) {
      const avg = c.reduce((a, b) => a + b, 0) / c.length;
      const d = Math.abs(avg - center) + (c[c.length - 1] > 76 ? 4 : 0);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // Riconosce l'accordo suonato (triadi e settime, anche in rivolto).
  function chordName(notes) {
    const set = [...new Set(notes.map(pc))];
    if (set.length < 3 || set.length > 4) return null;
    const order = ['maj', 'min', '7', 'maj7', 'm7', 'dim', 'aug', 'sus4', 'sus2'];
    for (const q of order) {
      const tones = QUALITIES[q].tones;
      if (tones.length !== set.length) continue;
      for (const root of set) {
        const rel = set.map((n) => (n - root + 12) % 12).sort((a, b) => a - b).join(',');
        if (rel === tones.slice().sort((a, b) => a - b).join(',')) {
          const l = chordLabel({ root, q, flat: false });
          return l.sub ? `${l.main} (${l.sub})` : l.main;
        }
      }
    }
    return null;
  }

  return { IT, EN, pc, isBlack, color, octave, label, short, parse,
           QUALITIES, parseChord, parseProgression, chordLabel, chordTones, chordNeed, voicing, chordName };
})();
