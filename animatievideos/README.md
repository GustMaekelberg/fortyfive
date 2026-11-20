# Testvideo's met HyperFrames

Elke map is één verticale testvideo (1080×1920, ongeveer 20 seconden, zonder geluid), volledig gemaakt met HTML, CSS, SVG en GSAP en gerenderd met [HyperFrames](https://github.com/heygen-com/hyperframes).

## Renderen

Vereist: Node 22 of hoger, FFmpeg en Chrome.

```bash
cd animatievideos/debt-free-date
npx --yes hyperframes@0.9.72 check                     # controle op fouten, veilige zones en contrast
npx --yes hyperframes@0.9.72 snapshot --at 0,3,8,14,19 # stilstaande beelden om na te kijken
npx --yes hyperframes@0.9.72 render -q standard -o out/video.mp4
```

Alles wat een video nodig heeft (GSAP, lettertypen, stijlkit) zit in de eigen `assets/`-map, dus er is tijdens het renderen geen internet nodig.

## Opbouw

- `kit/assets/`: de gedeelde stijlkit (`kit.css`, `kit.js`), GSAP en de lettertypen. Elke videomap bevat een kopie.
- `BRIEF.md`: de regels waarmee de video's gebouwd zijn (veilige tekstzone, verhaalopbouw, eerlijkheidsregels, werkwijze).
- `<video>/index.html`: de compositie. `<video>/calc.mjs` rekent de cijfers uit die in beeld komen.

## Goed om te weten

- De tekst staat in een vak van 768×952 pixels (x 120–888, y 296–1248). Dat is de zone die op TikTok, Reels en Shorts tegelijk vrij blijft van knoppen en bijschriften.
- De video's hebben geen geluid. Voeg muziek toe in de app bij het uploaden: de muziekbibliotheken van de platformen zijn alleen op het eigen platform gelicentieerd.
- De producten in de video's zijn concepten. Vervang de mockups door beelden van het echte product voor je iets publiceert.
