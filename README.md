# 🎨 ColorAnalyze

Application **Expo (iOS + Android + Web)** d'analyse de couleurs à partir d'une image.
Tout le traitement est réalisé **100 % côté client** — aucune donnée n'est envoyée à un serveur.

## Fonctionnalités

- **Import d'image** — depuis la galerie ou une capture d'écran (`expo-image-picker`), avec redimensionnement automatique pour l'analyse.
- **Extraction des couleurs dominantes** — algorithme **k-means** en JS pur, avec choix automatique du nombre de couleurs (5 à 10) via une méthode du coude simplifiée. Affiche les codes **HEX**, les valeurs **HSL** et le **pourcentage** de chaque couleur.
- **Roue chromatique (SVG)** — placement des couleurs selon la teinte (angle) et la saturation (rayon). Modes **RGB**, **CMY** et **RYB**.
- **Détection du schéma de couleurs** — Monochromatique, Analogique, Complémentaire, Split-Complémentaire, Triadique, Tétradique (carré), Double Split-Complémentaire.
- **Schémas alternatifs** — visualisation des décalages de teinte nécessaires + **score de disruption** pondéré par l'importance des couleurs, avec conseils.
- **Ambiances** — 10 filtres d'ambiance (Été, Hiver, Nostalgie, Sépia, Joie, Tristesse, Pastel, Néon, Vintage, Mystère) qui transforment la palette (manipulation HSL) pour prévisualiser le rendu.

## Stack technique

- Expo SDK 57 · React Native 0.86 · React 19
- `expo-image-picker`, `expo-image-manipulator`
- `react-native-svg` (roue chromatique)
- `upng-js` (décodage PNG côté natif pour lire les pixels sans backend)
- Aucune librairie UI lourde : React Native core + `StyleSheet`

## Architecture

```
App.js                      # Écran principal + navigation par onglets + import
lib/
  colorConversions.js       # RGB <-> HSL <-> HEX, distances de teinte
  colorAnalysis.js          # k-means, extraction des couleurs dominantes
  colorHarmony.js           # détection de schéma, schémas alternatifs, disruption
  atmospheres.js            # transformations HSL des ambiances
  imagePixels.js            # lecture des pixels (canvas web / PNG natif)
components/
  ColorWheel.js             # roue chromatique SVG (RGB / CMY / RYB)
  ColorPalette.js           # palette extraite (HEX + %)
  HarmonyPanel.js           # schéma détecté + alternatives + décalages HUE
  AtmospherePanel.js        # boutons d'ambiance + prévisualisation
```

## Démarrage

```bash
npm install

# Web
npm run web

# Mobile (via l'app Expo Go)
npm start        # puis scanner le QR code
npm run android
npm run ios      # nécessite macOS
```

## Notes

- Le traitement des couleurs est intégralement local (navigateur / appareil).
- Sur le web, les pixels sont lus via un `<canvas>` ; sur mobile, l'image est
  redimensionnée en PNG puis décodée en JS pur (`upng-js`).
