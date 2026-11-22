// Lettore di file MIDI standard (.mid). Restituisce le tracce con le note in millisecondi.
KS.midifile = (() => {
  function parse(buffer) {
    const d = new DataView(buffer);
    let p = 0;
    const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(d.getUint8(p + i)); p += n; return s; };
    const u32 = () => { const v = d.getUint32(p); p += 4; return v; };
    const u16 = () => { const v = d.getUint16(p); p += 2; return v; };
    const vlq = () => { let v = 0; let b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };

    if (str(4) !== 'MThd') throw new Error('Non sembra un file MIDI.');
    const hlen = u32();
    u16(); // formato
    const ntr = u16();
    const div = u16();
    p = 8 + hlen;

    const tracks = [];
    const tempos = [{ tick: 0, us: 500000 }];
    for (let t = 0; t < ntr && p < d.byteLength - 8; t++) {
      const id = str(4);
      const len = u32();
      const end = p + len;
      if (id !== 'MTrk') { p = end; continue; }
      const tr = { name: '', notes: [], channels: new Set() };
      let tick = 0;
      let run = 0;
      while (p < end) {
        tick += vlq();
        let st = d.getUint8(p);
        if (st < 0x80) st = run; else p++;
        if (st === 0xff) {
          const type = d.getUint8(p++);
          const l = vlq();
          if (type === 0x51 && l === 3) {
            tempos.push({ tick, us: (d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2) });
          } else if (type === 0x03 && !tr.name) {
            let s = ''; for (let i = 0; i < l; i++) s += String.fromCharCode(d.getUint8(p + i));
            tr.name = s.trim();
          }
          p += l;
        } else if (st === 0xf0 || st === 0xf7) {
          p += vlq();
        } else {
          run = st;
          const cmd = st & 0xf0;
          const ch = st & 0x0f;
          const a = d.getUint8(p++);
          const b = cmd === 0xc0 || cmd === 0xd0 ? 0 : d.getUint8(p++);
          if (cmd === 0x90 && b > 0) {
            tr.notes.push({ tick, note: a, ch });
            tr.channels.add(ch);
          }
        }
      }
      p = end;
      tracks.push(tr);
    }

    // Tempo: da tick a millisecondi.
    tempos.sort((a, b) => a.tick - b.tick);
    let toMs;
    if (div & 0x8000) {
      const fps = 256 - (div >> 8);
      const tpf = div & 0xff;
      toMs = (tick) => (tick * 1000) / (fps * tpf);
    } else {
      const segs = [];
      let ms = 0;
      for (let i = 0; i < tempos.length; i++) {
        const tp = tempos[i];
        if (i > 0) ms += ((tp.tick - tempos[i - 1].tick) * tempos[i - 1].us) / div / 1000;
        segs.push({ tick: tp.tick, ms, us: tp.us });
      }
      toMs = (tick) => {
        let s = segs[0];
        for (const x of segs) { if (x.tick <= tick) s = x; else break; }
        return s.ms + ((tick - s.tick) * s.us) / div / 1000;
      };
    }

    return tracks
      .map((tr, i) => {
        const notes = tr.notes.filter((n) => n.ch !== 9).map((n) => ({ t: toMs(n.tick), note: n.note }));
        const drums = tr.notes.length > 0 && notes.length === 0;
        const avg = notes.length ? notes.reduce((a, n) => a + n.note, 0) / notes.length : 0;
        return { index: i, name: tr.name || `Traccia ${i + 1}`, notes, drums, avg,
                 min: notes.length ? Math.min(...notes.map((n) => n.note)) : 0,
                 max: notes.length ? Math.max(...notes.map((n) => n.note)) : 0 };
      })
      .filter((t) => t.notes.length > 0);
  }

  // Raggruppa le note che partono insieme in un passo. melody=true tiene solo la nota più alta.
  function toSteps(notes, melody) {
    const sorted = notes.slice().sort((a, b) => a.t - b.t || b.note - a.note);
    const steps = [];
    for (const n of sorted) {
      const last = steps[steps.length - 1];
      if (last && n.t - last.t < 35) {
        if (!melody && !last.notes.includes(n.note)) last.notes.push(n.note);
      } else {
        steps.push({ notes: [n.note], t: Math.round(n.t) });
      }
    }
    if (!steps.length) return steps;
    const t0 = steps[0].t;
    steps.forEach((s, i) => {
      s.t -= t0;
      const next = steps[i + 1];
      s.d = next ? Math.max(80, next.t - t0 - s.t) : 600;
      s.notes.sort((a, b) => a - b);
      if (s.notes.length > 4) s.notes = s.notes.slice(-4); // al massimo 4 note per volta
    });
    return steps;
  }

  return { parse, toSteps };
})();
