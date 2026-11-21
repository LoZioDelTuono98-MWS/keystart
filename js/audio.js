// Piccolo sintetizzatore interno (Web Audio), così l'app suona anche senza altri programmi.
KS.audio = (() => {
  let ctx = null;
  let master = null;
  const voices = new Map();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function noteOn(m, vel = 100) {
    if (!KS.settings.get('sound')) return;
    const c = ensure();
    if (!c) return;
    noteOff(m, true);
    const t = c.currentTime;
    const g = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200 + vel * 25;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o1.type = 'triangle';
    o2.type = 'sine';
    o1.frequency.value = freq(m);
    o2.frequency.value = freq(m) * 2;
    g2.gain.value = 0.18;
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(filter).connect(master);
    const peak = 0.25 + 0.55 * (vel / 127);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 6.1);
    o2.stop(t + 6.1);
    voices.set(m, { g, o1, o2 });
  }

  function noteOff(m, fast) {
    const v = voices.get(m);
    if (!v || !ctx) return;
    voices.delete(m);
    const t = ctx.currentTime;
    const rel = fast ? 0.02 : 0.3;
    try {
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setValueAtTime(Math.max(v.g.gain.value, 0.0001), t);
      v.g.gain.exponentialRampToValueAtTime(0.0001, t + rel);
      v.o1.stop(t + rel + 0.05);
      v.o2.stop(t + rel + 0.05);
    } catch (e) { /* già fermato */ }
  }

  // Suonini di feedback: giusto / sbagliato.
  function cue(ok) {
    if (!KS.settings.get('sound')) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const notes = ok ? [1318.5, 1760] : [180];
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = ok ? 'sine' : 'square';
      o.frequency.value = f;
      const start = t + i * 0.07;
      const vol = ok ? 0.12 : 0.05;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + (ok ? 0.18 : 0.15));
      o.connect(g).connect(master);
      o.start(start);
      o.stop(start + 0.2);
    });
  }

  return { ensure, noteOn, noteOff, cue };
})();
