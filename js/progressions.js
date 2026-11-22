// Giri di accordi inclusi (giri comuni, non appartengono a nessuna canzone) e livelli degli accordi.
KS.progressions = (() => {
  const LIST = [
    { id: 'pop', name: 'Il giro pop', info: 'I – V – vi – IV · il più usato di sempre', chords: 'C G Am F', beats: 4, bpm: 80 },
    { id: 'anni50', name: 'Il giro di Do', info: "Quello delle canzoni anni '50 e '60", chords: 'C Am F G', beats: 4, bpm: 80 },
    { id: 'ballata', name: 'Ballata in minore', info: 'Partenza malinconica', chords: 'Am F C G', beats: 4, bpm: 72 },
    { id: 'rock', name: 'Rock in La', info: 'Tre accordi, tanta energia', chords: 'A D A E', beats: 4, bpm: 100 },
    { id: 'blues', name: 'Blues in Do (12 battute)', info: 'Con le settime', chords: 'C7 F7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7', beats: 4, bpm: 90 },
    { id: 'canone', name: 'Canone di Pachelbel', info: 'Pubblico dominio · otto accordi', chords: 'D A Bm F#m G D G A', beats: 4, bpm: 70 },
    { id: 'andaluso', name: 'Cadenza andalusa', info: 'Scende di un tono alla volta', chords: 'Am G F E', beats: 4, bpm: 84 },
  ];

  // Livelli della schermata "Accordi".
  const LEVELS = {
    1: { name: 'Do, Fa, Sol', chords: 'C F G' },
    2: { name: 'Lam, Rem, Mim', chords: 'Am Dm Em C F G' },
    3: { name: 'Re, La, Mi', chords: 'D A E Bm' },
    4: { name: 'Bemolli e diesis', chords: 'Bb Eb F#m C#m Ab' },
    5: { name: 'Le settime', chords: 'G7 C7 D7 Am7 Fmaj7 Dm7' },
  };

  return { list: () => LIST, get: (id) => LIST.find((p) => p.id === id) || KS.library.progs().find((p) => p.id === id), LEVELS };
})();
