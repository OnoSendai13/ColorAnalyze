# Changelog

## [1.2.0] - 2026-09-22

### Ajouts
- Internationalisation complète fr/en via `lib/i18n.js` avec switch FR/EN côté header
- Sélecteur de langue toggle FR/EN type interrupteur, design aligné ThemeToggle
- `LanguageMenu` composant réactif au changement de langue avec subscription

### Correctifs
- Correction des onglets Palette & Roue / Harmonies / Ambiances (active state et labels i18n)
- Suppression du `await import` auto-référentiel dans `lib/editingGuidance.js` causant SyntaxError
- Correction des imports/exports `EDITING_SOFTWARE` et nettoyage du commentaire JSDoc brisé
- Fix de la logique active des onglets : `tab === tabItem.key` et mapping correct

## [1.1.0] - 2026-09-21

### Ajouts
- Poids de présence `computeWeights` et score de disruption pondéré `disruptionScore`
- Lecture croisée RGB / CMY / RYB avec conversion RYB fidèle
- Génération de consignes de retouche TSL/HSL/Courbes/Color Grading via `generateGuidance`
- Enregistrement local des analyses : `saveAnalysis`, `loadAnalysis`, `listAnalyses` (localStorage)

### Correctifs
- RYB : conversion améliorée pour usage pro

## [1.0.1] - 2026-09-21

### Correctif

- Web : la prévisualisation photo se rafraîchit désormais lors du changement de schéma d'harmonie. Le canvas tient compte de la signature des mappings avant de peindre l'image.
