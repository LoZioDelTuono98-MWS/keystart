// Canzoni incluse: solo brani di pubblico dominio ed esercizi originali.
// Formato: "NOTA:durata" separati da spazi. Durata in battiti (1 = un quarto). Default 1.
KS.songs = (() => {
  const LIST = [
    {
      id: 'scala-do',
      title: 'Scala di Do',
      info: 'Esercizio · solo tasti bianchi',
      level: 1,
      bpm: 90,
      notes: 'C4 D4 E4 F4 G4 A4 B4 C5:2 B4 A4 G4 F4 E4 D4 C4:2',
    },
    {
      id: 'fra-martino',
      title: 'Fra Martino',
      info: 'Tradizionale',
      level: 1,
      bpm: 100,
      notes:
        'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 ' +
        'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 ' +
        'C4 G3 C4:2 C4 G3 C4:2',
    },
    {
      id: 'inno-gioia',
      title: 'Inno alla gioia',
      info: 'Beethoven · 1824',
      level: 2,
      bpm: 100,
      notes:
        'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 ' +
        'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2 ' +
        'D4 D4 E4 C4 D4 E4:0.5 F4:0.5 E4 C4 D4 E4:0.5 F4:0.5 E4 D4 C4 D4 G3:2 ' +
        'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2',
    },
    {
      id: 'jingle-bells',
      title: 'Jingle Bells (ritornello)',
      info: 'J. Pierpont · 1857',
      level: 2,
      bpm: 120,
      notes:
        'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 ' +
        'F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2 ' +
        'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 ' +
        'F4 F4 F4 F4 F4 E4 E4 E4:0.5 E4:0.5 G4 G4 F4 D4 C4:4',
    },
    {
      id: 'per-elisa',
      title: 'Per Elisa (inizio)',
      info: 'Beethoven · 1810 · ci sono tasti neri!',
      level: 3,
      bpm: 70,
      notes:
        'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 ' +
        'C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 G#4:0.5 B4:0.5 C5:1.5 ' +
        'E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1.5 ' +
        'C4:0.5 E4:0.5 A4:0.5 B4:1.5 E4:0.5 C5:0.5 B4:0.5 A4:2',
    },
  ];

  function parse(song) {
    return song.notes.trim().split(/\s+/).map((tok) => {
      const [n, d] = tok.split(':');
      return { note: KS.notes.parse(n), dur: d ? parseFloat(d) : 1 };
    });
  }

  return { list: () => LIST, get: (id) => LIST.find((s) => s.id === id), parse };
})();
