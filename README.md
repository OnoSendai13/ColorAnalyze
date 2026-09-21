# 🎨 ColorAnalyze

Version actuelle : **1.1.0** · [Changelog](CHANGELOG.md)

Application **Expo (iOS + Android + Web)** d'analyse chromatique à partir d'une image.
Tout le traitement est réalisé **100 % côté client** — aucune donnée n'est envoyée à un serveur.
Interface intégralement en **français**, avec **thème clair et sombre**.

## Fonctionnalités

- **Import d'image** — depuis la galerie ou une capture d'écran (`expo-image-picker`), avec redimensionnement automatique pour l'analyse. Bandeau de confidentialité rappelant le traitement 100 % local.
- **Extraction des couleurs dominantes** — algorithme **k-means** en JS pur, avec choix automatique du nombre de couleurs (5 à 10) via une méthode du coude simplifiée. Affiche les codes **HEX**, les valeurs **HSL** et le **pourcentage** de chaque couleur.
- **Édition de la palette** — la palette extraite est modifiable et sert de source de vérité : suppression, fusion pondérée de couleurs, réglage du nombre de teintes (5 → 10) et réinitialisation. Les surfaces se renormalisent à 100 %.
- **Roue chromatique (SVG)** — placement des couleurs selon la teinte (angle) et la saturation (rayon). Modes **RGB**, **CMY** et **RYB**, avec une explication repliable de l'usage de chaque modèle.
- **Détection du schéma de couleurs** — Monochromatique, Analogique, Complémentaire, Split-Complémentaire, Triadique, Tétradique (carré), Double Split-Complémentaire.
- **Schémas alternatifs & score de disruption** — visualisation des décalages de teinte nécessaires + **score de disruption** pondéré par l'importance des couleurs. Un encart « Comment ce score est calculé ? » détaille la formule et la contribution chiffrée de chaque couleur.
- **Prévisualisation photo avant/après** — sur le **web**, la photo est re-teintée en direct via `<canvas>` selon le schéma choisi, avec bascule Avant/Après. Sur mobile, un aperçu de repli élégant est affiché.
- **Ambiances** — 10 filtres d'ambiance (Été, Hiver, Nostalgie, Sépia, Joie, Tristesse, Pastel, Néon, Vintage, Mystère) qui transforment la palette (manipulation HSL) pour prévisualiser le rendu.
- **Consignes de retouche** — instructions concrètes (TSL / Courbes / Color Grading) déclinées pour 12 logiciels d'édition.
- **Export de l'analyse** — copie d'un rapport texte structuré et export **CSV**.

## Stack technique

- Expo SDK 57 · React Native 0.86 · React 19
- `expo-image-picker`, `expo-image-manipulator`, `expo-clipboard`
- `react-native-svg` (roue chromatique) · `@expo/vector-icons` (icônes Feather)
- `upng-js` (décodage PNG côté natif pour lire les pixels sans backend)
- Aucune librairie UI lourde : React Native core + `StyleSheet`, thème maison

## Architecture

```
App.js                      # Écran principal + navigation par onglets + import + export
lib/
  theme.js                  # thème clair/sombre, tokens, ThemeContext, ThemeToggle
  colorConversions.js       # RGB <-> HSL <-> HEX, distances de teinte
  colorAnalysis.js          # k-means, extraction des couleurs dominantes
  colorHarmony.js           # détection de schéma, schémas alternatifs, disruption
  paletteEdit.js            # suppression, fusion pondérée, renormalisation de la palette
  atmospheres.js            # transformations HSL des ambiances
  editingGuidance.js        # consignes TSL / Courbes / Color Grading par logiciel
  imagePixels.js            # lecture des pixels (canvas web / PNG natif)
  imageRecolor.js           # re-teintage de la photo (canvas web) pour l'avant/après
  report.js                 # génération du rapport texte et du CSV
components/
  ColorWheel.js             # roue chromatique SVG (RGB / CMY / RYB) + explication
  ColorPalette.js           # palette extraite + édition (HEX + %)
  HarmonyPanel.js           # schéma détecté + alternatives + détail du score
  ImagePreview.js           # prévisualisation photo avant/après
  AtmospherePanel.js        # boutons d'ambiance + prévisualisation
  EditingGuidance.js        # consignes de retouche par logiciel
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

- Le traitement des couleurs est intégralement local (navigateur / appareil) — aucune donnée n'est transmise.
- Sur le web, les pixels sont lus via un `<canvas>` ; sur mobile, l'image est
  redimensionnée en PNG puis décodée en JS pur (`upng-js`).
- La prévisualisation photo avant/après est optimisée pour le web (re-teintage `<canvas>`) ;
  sur mobile, un aperçu de repli est présenté.

## Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.
