# 🎹 KeyStart

App per imparare a suonare la tastiera MIDI, pensata per chi si distrae facilmente: una cosa per schermata, pulsanti grandi, feedback immediato, sessioni brevi.

Testata con la **M-VAVE SMK-25 II**, ma funziona con qualsiasi tastiera MIDI.

## Cosa c'è

- **Suona libero**: premi un tasto e vedi la nota in grande, col suo colore. Riconosce gli accordi (anche le settime).
- **Trova la nota**: gioco da 60 secondi, 4 livelli da sbloccare.
- **Leggi la nota**: pentagramma in chiave di violino e di basso, con tagli e diesis. 5 livelli.
- **Accordi**: l'app mostra un accordo, tu lo suoni in qualsiasi rivolto. 5 livelli, dalle triadi alle settime.
- **Giri**: giri di accordi da suonare "aspetta me" o **a tempo** col metronomo. Puoi scrivere i giri della band (es. `Am F C G` oppure `Lam Fa Do Sol`).
- **Canzoni**: la canzone ti aspetta finché non premi il tasto giusto. Brani di pubblico dominio inclusi,
  più i **tuoi file MIDI**: scegli la traccia, solo melodia o anche accordi. Restano solo sul tuo dispositivo.
- **Aspetto**: 6 temi colore (Mare, Laguna, Tramonto, Ulivo, Notte, Sabbia), chiaro / scuro / automatico.
- **Giorni di fila**: la home conta i giorni in cui ti sei esercitato.
- **APK Android**: tastiera via USB-C oppure **Bluetooth** (Impostazioni → Cerca tastiere Bluetooth).

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

## APK Android

A ogni push su `main` GitHub compila l'APK e la pubblica tra le
[Release](../../releases/latest). Ogni versione si installa sopra la precedente.

Simboli musicali: font Bravura (SIL Open Font License). Font: Inter e Space Grotesk (SIL OFL).

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
