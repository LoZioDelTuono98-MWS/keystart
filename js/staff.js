// Disegna un pentagramma con una nota (chiave di violino o di basso).
KS.staff = (() => {
  const LETTER = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // pc -> indice lettera (C=0..B=6)
  const SP = 16; // distanza fra le righe in px (unità SVG)

  // Posizione diatonica: C4 = 28. I diesis stanno sulla stessa riga della nota naturale.
  const diatonic = (m) => (Math.floor(m / 12) - 1) * 7 + LETTER[((m % 12) + 12) % 12];

  function glyph(d, x, y) {
    const s = SP / 250; // nel font 250 unità = uno spazio fra le righe
    return `<path d="${d}" transform="translate(${x} ${y}) scale(${s} ${-s})" fill="currentColor"/>`;
  }

  // clef: 'treble' | 'bass'
  function svg(note, clef) {
    const W = 340;
    const H = 200;
    const top = 60; // y della riga in alto
    const bottomRef = clef === 'treble' ? diatonic(64) : diatonic(43); // Mi4 / Sol2 sulla riga in basso
    const yOf = (dia) => top + 4 * SP - (dia - bottomRef) * (SP / 2);
    let out = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pentagramma">`;
    for (let i = 0; i < 5; i++) {
      out += `<line x1="10" x2="${W - 10}" y1="${top + i * SP}" y2="${top + i * SP}" stroke="currentColor" stroke-width="1.6" opacity=".75"/>`;
    }
    if (clef === 'treble') out += glyph(KS.glyphs.gClef, 22, top + 3 * SP);
    else out += glyph(KS.glyphs.fClef, 22, top + SP);

    if (note != null) {
      const dia = diatonic(note);
      const y = yOf(dia);
      const x = 205;
      // tagli addizionali
      for (let d = bottomRef - 2; d >= dia; d -= 2) out += ledger(x, yOf(d));
      for (let d = bottomRef + 10; d <= dia; d += 2) out += ledger(x, yOf(d));
      if (KS.notes.isBlack(note)) out += glyph(KS.glyphs.sharp, x - 34, y);
      out += `<ellipse class="note-head" cx="${x}" cy="${y}" rx="${SP * 0.68}" ry="${SP * 0.5}" transform="rotate(-20 ${x} ${y})"/>`;
      // gambo
      const up = dia < bottomRef + 4;
      const sx = up ? x + SP * 0.62 : x - SP * 0.62;
      out += `<line class="note-head" x1="${sx}" x2="${sx}" y1="${y}" y2="${up ? y - SP * 3.4 : y + SP * 3.4}" style="stroke:var(--c)" stroke-width="2.2"/>`;
    }
    return out + '</svg>';
  }

  function ledger(x, y) {
    return `<line x1="${x - 18}" x2="${x + 18}" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="1.6" opacity=".75"/>`;
  }

  return { svg, diatonic };
})();
