// Temi colore (gli stessi di Abboccata) e modalità chiara / scura / automatica.
KS.theme = (() => {
  const THEMES = [
    { id: 'mare', name: 'Mare', c: '#1F6FD6', c2: '#0E9F9A', cd: '#5AA9FF', cd2: '#5EE0C8', surf: '#3D7BD6', p: [5, 8, 15, 20], gl: 28 },
    { id: 'laguna', name: 'Laguna', c: '#0B8C86', c2: '#D9822B', cd: '#34D1BF', cd2: '#F6B26B', surf: '#2A9C92', p: [5, 8, 15, 20], gl: 28 },
    { id: 'tramonto', name: 'Tramonto', c: '#D9512C', c2: '#C98A0E', cd: '#FF8466', cd2: '#FFCB6B', surf: '#C9624A', p: [4, 7, 13, 18], gl: 28 },
    { id: 'ulivo', name: 'Ulivo', c: '#557F27', c2: '#B9861C', cd: '#A3CF6A', cd2: '#EBCB7A', surf: '#7E9C55', p: [4, 7, 14, 18], gl: 24 },
    { id: 'notte', name: 'Notte', c: '#6A4BE6', c2: '#8E75F0', cd: '#A98BFF', cd2: '#CBB9FF', surf: '#A98BFF', p: [9, 15, 26, 32], gl: 55 },
    { id: 'sabbia', name: 'Sabbia', c: '#A86D10', c2: '#2B83C2', cd: '#F2B45A', cd2: '#86CFFA', surf: '#B48A55', p: [4, 7, 14, 18], gl: 26 },
  ];
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function isDark() {
    const m = KS.settings.get('mode');
    return m === 'dark' || (m === 'auto' && !!(mq && mq.matches));
  }

  function apply() {
    const dark = isDark();
    const R = document.documentElement;
    R.dataset.mode = dark ? 'dark' : 'light';
    const t = THEMES.find((x) => x.id === KS.settings.get('theme')) || THEMES[0];
    const set = (k, v) => R.style.setProperty(k, v);
    set('--accent', dark ? t.cd : t.c);
    set('--accent2', dark ? t.cd2 : t.c2);
    set('--surf', t.surf);
    t.p.forEach((v, i) => set('--p' + (i + 1), v + '%'));
    set('--gl', t.gl + '%');
    const bg = dark ? '#000000' : '#F3F5F8';
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = bg;
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      cap.nativePromise('Midi', 'setBars', { dark, color: bg }).catch(() => {});
    }
  }

  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  KS.settings.onChange((k) => { if (k === 'mode' || k === 'theme') apply(); });

  return { THEMES, apply, isDark };
})();
