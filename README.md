# 🎹 KeyStart

App per imparare a suonare la tastiera MIDI, pensata per chi si distrae facilmente: una cosa per schermata, pulsanti grandi, feedback immediato, sessioni brevi.

Testata con la **M-VAVE SMK-25 II**, ma funziona con qualsiasi tastiera MIDI.

## Cosa c'è (v1)

- **Suona libero**: premi un tasto e vedi la nota in grande, col suo colore. Riconosce gli accordi maggiori e minori.
- **Trova la nota**: gioco da 60 secondi con 4 livelli da sbloccare (Do-Re-Mi → tutti i tasti, anche i neri).
- **Canzoni**: la canzone ti **aspetta** finché non premi il tasto giusto. Con 👂 *Ascolta* la senti prima suonata.
  Brani inclusi (pubblico dominio): Scala di Do, Fra Martino, Inno alla gioia, Jingle Bells, Per Elisa.
- **Impostazioni**: nomi delle note in Do-Re-Mi, in C-D-E o entrambi; suono dell'app on/off; nomi sui tasti.

## Come si usa

1. Collega la tastiera via **USB**.
2. Apri l'app con **Chrome** o **Edge** (Safari/iPhone non supportano il MIDI).
3. Quando il browser chiede il permesso MIDI, consenti.

Niente tastiera? Tocca i tasti a schermo oppure usa la tastiera del PC:
`A S D F G H J K` = tasti bianchi, `W E T Y U` = neri, `Z` / `X` = ottava giù / su.

Se la tastiera suona già con Cantabile o FL Studio, spegni il suono dell'app nelle Impostazioni.

### Sul telefono Android
Apri il link dell'app in Chrome → menu ⋮ → **Installa app**. La tastiera si collega con un cavo USB-C/OTG.

## Pubblicare l'app (GitHub Pages)

Il workflow in `.github/workflows/pages.yml` pubblica l'app a ogni push su `main`.
Per attivarlo: **Settings → Pages → Source: GitHub Actions**.
Nota: su un account gratuito GitHub Pages funziona solo con repo **pubbliche**.

Provarla in locale: basta aprire `index.html` con Chrome, oppure `python3 -m http.server` e andare su `http://localhost:8000`.

## In arrivo

- Leggi la nota sul pentagramma
- Accordi, rivolti e giri di accordi
- Importa i tuoi file MIDI (restano solo sul tuo dispositivo)
- Sequenze di accordi delle canzoni della band
- APK Android

## Struttura

```
index.html            pagina unica
css/style.css         grafica
js/input.js           MIDI, tastiera del PC, tocco
js/audio.js           sintetizzatore interno
js/keyboard-view.js   tastiera a schermo
js/songs.js           canzoni incluse
js/screens/*.js       le schermate
sw.js                 funzionamento offline
```

Nessuna dipendenza, nessuna build: HTML, CSS e JavaScript puri.
