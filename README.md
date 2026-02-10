# MapboxFlight

Flyg over en 3D-varld genom att rora kroppen framfor din webcam.

## Styrning

| Rorelse | Effekt |
|---------|--------|
| Flaxa armarna (upp -> ner) | Flyg framat |
| Luta kroppen vanster/hoger | Svang |
| Armar upp (ovanfor axlar) | Stig |
| Armar ner (under axlar) | Sjunk |

## Kom igang

1. Skaffa en Mapbox access token fran https://account.mapbox.com/access-tokens/
2. Kopiera `.env.example` till `.env` och fyll i din token:
   ```
   cp .env.example .env
   ```
3. Installera och starta:
   ```
   npm install
   npm run dev
   ```
4. Oppna sidan i Chrome, ange valfri startadress och klicka **Start Flying**

## Teknikstack

- **Vite** - Byggverktyg och dev-server
- **Mapbox GL JS v3** - 3D-karta med terrain och satellitbilder
- **MediaPipe Pose Landmarker** - Kroppsspaning via webcam (laddas fran CDN)

## Projektstruktur

```
src/
  main.js              - Startlogik och game loop
  constants.js         - Alla justerbara parametrar
  map-setup.js         - Mapbox-karta med 3D-terrain och fog
  pose-detector.js     - MediaPipe pose-detection (15 fps)
  pose-interpreter.js  - Tolkar pose till flygkommandon
  flight-controller.js - Fysikmodell med momentum och friktion
  camera-driver.js     - Styr Mapbox FreeCameraOptions
  hud.js               - HUD-display och skeleton-rendering
```
