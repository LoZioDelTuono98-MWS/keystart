// Copia i file dell'app web in www/ (la cartella che Capacitor mette dentro l'APK).
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'fonts'];
rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, `www/${f}`, { recursive: true });
console.log('www/ pronto');
