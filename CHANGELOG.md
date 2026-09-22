# Changelog

## [1.3.0] - 2026-09-22

### Ajouts

#### Onboarding (premier lancement)
- Carrousel de visite guidée 5 écrans avec illustrations SVG inline (Bienvenue, Import, Palette & Roue, Harmonies & Ambiances, Confidentialité)
- Persistance du flag via `@react-native-async-storage/async-storage` — ne se réaffiche plus après le premier passage
- Bouton « Passer » et dots indicateurs cliquables ; fade-out à la fin
- Entièrement bilingue FR/EN

#### Écran « À propos » / Mentions légales
- Politique de confidentialité conforme Google Play & Apple App Store (données collectées, stockage local, services tiers, enfants, modifications)
- Conditions d'utilisation
- Crédits & licences (dépendances open-source)
- Support & contact (e-mail, signalement de bug)
- Boutons d'action rapide : Évaluer (lien store), Contact (mailto), Signaler un bug
- Accessible via le bouton ⓘ dans le header

#### Roue chromatique — fix visuel majeur
- L'anneau de fond s'adapte désormais au mode sélectionné (RGB / CMY / RYB) grâce à une nouvelle fonction `wheelAngleToHue()` (transformation inverse)
- Labels de primaires (R/G/B, C/M/Y, R/Y/B) affichés sur l'anneau extérieur
- Passage de 60 à 72 segments pour un rendu plus lisse

#### Système i18n — refonte complète
- `LanguageProvider` + hook `useLang()` via React Context — le changement de langue déclenche un re-render global
- Sélecteur de langue segmented control FR|EN (remplacement du `<select>` HTML incompatible mobile)
- ~170 clés FR/EN couvrant l'intégralité de l'interface, onboarding et mentions légales
- Fix du conflit de variable `t` dans `TABS.map()` (renommé `tabItem`)

#### Animations & micro-interactions (inspirées siteinspire.com)
- **Pill slider animé** sur les onglets (fond accent glisse via `Animated.spring`)
- **Pressed state** sur tous les `Pressable` : `translateY(1) + scale(0.97)` sur web, `opacity` sur mobile
- **LayoutAnimation** sur toutes les sections repliables (hauteur animée)
- **Rotation animée des chevrons** (180° via `Animated.timing`)
- **FadeInView** : apparition en cascade des résultats (stagger fade-in + translateY spring)
- **Barre de disruption animée** : remplissage progressif de 0% à la valeur (500ms)
- **Transition douce clair/sombre** : injection CSS globale `transition` sur web
- **Dropzone marching ants** : bordure SVG animée via CSS `@keyframes`
- **Brand dot chromatique** : 4 quadrants colorés en rotation perpétuelle lente (20s/tour)
- **Spectre chromatique décoratif** : dots colorés dans la dropzone à l'état vide

### Correctifs
- Fix `editingGuidance.js` : suppression de `generateGuidance()` (broken `await` hors `async`), export propre de `EDITING_SOFTWARE`
- Fix : tous les textes en dur remplacés par des appels `t('clé')` dans tous les composants
- Labels de section uniformisés en `textTransform: 'uppercase'` + `letterSpacing`

### Mise à jour
- `app.json` : version 1.3.0, `userInterfaceStyle: "automatic"`, `bundleIdentifier` / `package`, `NSPhotoLibraryUsageDescription`, `privacyPolicyUrl`
- Ajout de `@react-native-async-storage/async-storage` aux dépendances

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
