# ColorAnalyze

Version actuelle : **1.3.0** · [Changelog](CHANGELOG.md)

Application **Expo (iOS + Android + Web)** d'analyse chromatique a partir d'une image.
Tout le traitement est realise **100 % cote client** — aucune donnee n'est envoyee a un serveur.
Interface bilingue **francais / anglais**, avec **theme clair et sombre**.

## Fonctionnalites

- **Onboarding** — carrousel de visite guidee au premier lancement (5 ecrans illustres). Ne se reaffiche plus apres le premier passage (persistance `AsyncStorage`).
- **Import d'image** — depuis la galerie ou une capture d'ecran (`expo-image-picker`), avec glisser-deposer sur le web. Dropzone animee (marching ants). Bandeau de confidentialite.
- **Extraction des couleurs dominantes** — algorithme **k-means** en JS pur, avec choix automatique du nombre de couleurs (5 a 10) via une methode du coude simplifiee. Affiche les codes **HEX**, les valeurs **HSL** et le **pourcentage** de chaque couleur.
- **Edition de la palette** — suppression, fusion ponderee de couleurs, reglage du nombre de teintes (5 -> 10) et reinitialisation. Les surfaces se renormalisent a 100 %.
- **Roue chromatique (SVG)** — placement des couleurs selon la teinte (angle) et la saturation (rayon). Modes **RGB**, **CMY** et **RYB** avec anneau adapte a chaque modele, labels de primaires, et explication repliable.
- **Detection du schema de couleurs** — Monochromatique, Analogique, Complementaire, Split-Complementaire, Triadique, Tetradique (carre), Double Split-Complementaire.
- **Schemas alternatifs & score de disruption** — visualisation des decalages de teinte necessaires + **score de disruption** pondere (barre animee). Encart « Comment ce score est calcule ? » avec detail par couleur.
- **Previsualisation photo avant/apres** — re-teintage en direct via `<canvas>` (web), apercu de repli sur mobile.
- **Ambiances** — 10 filtres d'ambiance (Ete, Hiver, Nostalgie, Sepia, Joie, Tristesse, Pastel, Neon, Vintage, Mystere).
- **Consignes de retouche** — instructions concretes (TSL / Courbes / Color Grading) declinees pour 12 logiciels d'edition.
- **Export** — rapport texte structure, JSON, CSS, SASS, CSV.
- **A propos / Mentions legales** — politique de confidentialite, conditions d'utilisation, credits & licences, contact, evaluation. Conforme Google Play & Apple App Store.
- **Internationalisation** — francais et anglais, changement en temps reel via un segmented control dans le header.
- **Theme clair / sombre** — detecte automatiquement les preferences systeme, basculable manuellement.
- **Animations** — pill slider sur les onglets, fade-in en cascade, barre de disruption animee, chevrons rotatifs, transitions douces clair/sombre, dropzone marching ants.

## Stack technique

- Expo SDK 57 · React Native 0.86 · React 19
- `expo-image-picker`, `expo-image-manipulator`, `expo-clipboard`
- `react-native-svg` (roue chromatique) · `@expo/vector-icons` (icones Feather)
- `@react-native-async-storage/async-storage` (persistance onboarding)
- `upng-js` (decodage PNG cote natif pour lire les pixels sans backend)
- Aucune librairie UI lourde : React Native core + `StyleSheet`, theme maison

## Architecture

```
App.js                          # Point d'entree, onboarding conditionnel, navigation
lib/
  theme.js                      # theme clair/sombre, tokens, ThemeContext, ThemeToggle
  i18n.js                       # LanguageProvider, useLang(), dictionnaires FR/EN (~170 cles)
  onboarding.js                 # persistance AsyncStorage du flag premier lancement
  colorConversions.js           # RGB <-> HSL <-> HEX, distances de teinte
  colorAnalysis.js              # k-means, extraction des couleurs dominantes
  colorHarmony.js               # detection de schema, schemas alternatifs, disruption
  paletteEdit.js                # suppression, fusion ponderee, renormalisation
  atmospheres.js                # transformations HSL des ambiances
  editingGuidance.js            # consignes TSL / Courbes / Color Grading + liste logiciels
  imagePixels.js                # lecture des pixels (canvas web / PNG natif)
  imageRecolor.js               # re-teintage de la photo (canvas web)
  report.js                     # generation du rapport texte, JSON, CSV, CSS, SASS
components/
  OnboardingCarousel.js         # carrousel de visite guidee (5 slides SVG)
  LegalScreen.js                # mentions legales, confidentialite, contact, credits
  LanguageMenu.js               # selecteur FR/EN segmented control
  ColorWheel.js                 # roue chromatique SVG (RGB / CMY / RYB) + primaires
  ColorPalette.js               # palette extraite + edition (HEX + %)
  HarmonyPanel.js               # schema detecte + alternatives + score disruption
  ImagePreview.js               # previsualisation photo avant/apres
  AtmospherePanel.js            # boutons d'ambiance + previsualisation
  EditingGuidance.js            # consignes de retouche par logiciel
```

## Demarrage

```bash
npm install

# Web
npm run web

# Mobile (via l'app Expo Go)
npm start        # puis scanner le QR code
npm run android
npm run ios      # necessite macOS
```

## Conformite stores

L'application est prete pour une soumission Google Play et Apple App Store :

- **Politique de confidentialite** integree (ecran « A propos »)
- **Conditions d'utilisation** integrees
- **Pas de collecte de donnees** — Data Safety form simplifiee
- **Pas de publicite, pas d'achat integre**
- **Convient a tous les ages** (pas de contenu inapproprie)
- **Contact e-mail** accessible depuis l'app
- **Onboarding** conforme aux guidelines (valeur ajoutee immediate, pas de mur de texte)
- `NSPhotoLibraryUsageDescription` configure pour iOS

## Notes

- Le traitement des couleurs est integralement local (navigateur / appareil) — aucune donnee n'est transmise.
- Sur le web, les pixels sont lus via un `<canvas>` ; sur mobile, l'image est redimensionnee en PNG puis decodee en JS pur (`upng-js`).
- La previsualisation photo avant/apres est optimisee pour le web (re-teintage `<canvas>`) ; sur mobile, un apercu de repli est presente.

## Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique des versions.
