# Changelog

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
