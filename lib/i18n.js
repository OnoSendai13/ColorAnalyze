// lib/i18n.js
// Système i18n réactif : LanguageProvider + useLang() hook.
// Chaque changement de langue déclenche un re-render global.

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Dictionnaire
// ---------------------------------------------------------------------------

const LANG = {
  fr: {
    // Général
    appName: 'ColorAnalyze',
    langMenu: 'Langue',
    langLabel: 'FR',
    langFR: 'Français',
    langEN: 'English',
    subtitle: 'Analyse les couleurs d\'une image : palette, roue chromatique, harmonies et ambiances.',
    footer: 'Traitement 100% local \u00b7 aucune donn\u00e9e envoy\u00e9e.',

    // Import
    importImage: 'Importer une image',
    importAnother: 'Choisir une autre image',
    dropHintWeb: 'Glissez-d\u00e9posez une image ici, ou cliquez pour parcourir',
    dropHintMobile: 'Touchez pour choisir une photo ou une capture d\'\u00e9cran',
    analyzing: 'Analyse des couleurs\u2026',

    // Confidentialit\u00e9
    privacyNote: 'Confidentialit\u00e9 : l\'image et les pixels restent sur votre appareil. L\'application ne sauvegarde ni image, ni palette, ni historique. Aucune analyse, t\u00e9l\u00e9m\u00e9trie ou donn\u00e9e n\'est transmise \u00e0 un serveur ou \u00e0 un service tiers pour l\'analyse. Les exports sont initi\u00e9s par vous et quittent l\'application uniquement via le t\u00e9l\u00e9chargement, le partage ou le presse-papiers choisi. Sans sauvegarde persistante, l\'\u00e9tat dispara\u00eet \u00e0 la fermeture ou au rafra\u00eechissement ; aucune suppression c\u00f4t\u00e9 serveur n\'est n\u00e9cessaire.',

    // Onglets
    tabPalette: 'Palette & Roue',
    tabHarmony: 'Harmonies',
    tabAtmosphere: 'Ambiances',

    // Palette
    paletteExtracted: 'Palette extraite',
    colorsLabel: 'Couleurs',
    resetPalette: 'R\u00e9initialiser',
    resetPaletteA11y: 'R\u00e9initialiser la palette',
    mergeColors: 'Fusionner {n} couleurs',
    deleteColorA11y: 'Supprimer cette couleur',
    lessColorsA11y: 'Moins de couleurs',
    moreColorsA11y: 'Plus de couleurs',
    paletteHint: 'S\u00e9lectionnez des couleurs pour les fusionner, ou supprimez-en. Les pourcentages sont recalcul\u00e9s et propag\u00e9s \u00e0 la roue, aux harmonies et aux ambiances.',

    // Roue chromatique
    wheelCaption: 'Angle = teinte \u00b7 Distance au centre = saturation \u00b7 Taille = importance',
    wheelExplainTitle: 'Pourquoi RGB, CMY et RYB diff\u00e8rent ?',
    wheelExplainIntro: 'Une m\u00eame couleur ne se place pas au m\u00eame angle selon le mod\u00e8le, car chaque mod\u00e8le d\u00e9finit des primaires diff\u00e9rentes et d\u00e9coupe donc le cercle chromatique autrement.',
    wheelRgbDesc: 'm\u00e9lange additif de lumi\u00e8re (\u00e9crans, photo). Primaires : rouge, vert, bleu.',
    wheelCmyDesc: 'm\u00e9lange soustractif d\'encres (impression). Primaires : cyan, magenta, jaune ; la roue est en quelque sorte l\'oppos\u00e9e de la roue RGB.',
    wheelRybDesc: 'mod\u00e8le traditionnel des artistes (peinture). Primaires : rouge, jaune, bleu.',
    wheelExplainConclusion: 'Cons\u00e9quence : le compl\u00e9mentaire d\'une couleur change de mod\u00e8le en mod\u00e8le. Le compl\u00e9mentaire du rouge est le cyan en RGB, mais le vert en RYB. Comparer les trois roues aide \u00e0 choisir des accords coh\u00e9rents selon le support (\u00e9cran, impression, peinture).',

    // Harmonies
    detectedScheme: 'Sch\u00e9ma d\u00e9tect\u00e9',
    exploreSchemes: 'Explorer d\'autres sch\u00e9mas',
    confidence: 'Confiance',
    hueFamilies: 'Familles de teintes',
    neutrals: 'Neutres',
    transformTo: 'Transformation vers \u00ab {name} \u00bb',
    disruptionScore: 'Score de disruption',
    calcTitle: 'Comment ce score est calcul\u00e9 ?',
    calcExplain: 'Le score mesure l\'ampleur de la retouche n\u00e9cessaire pour atteindre ce sch\u00e9ma. On calcule le d\u00e9calage de teinte de chaque couleur, puis on en fait une moyenne pond\u00e9r\u00e9e par la surface (%) qu\'occupe la couleur dans l\'image. Les tons neutres sont ignor\u00e9s.',
    hueShiftLabel: 'D\u00e9calage de teinte',
    weightedSurface: 'surface',
    weightedAvg: 'moyenne pond\u00e9r\u00e9e par la surface',
    formulaAvg: 'd\u00e9calage moyen = \u03a3(|d\u00e9calage\u00b0| \u00d7 surface%) \u00f7 \u03a3surface%',
    formulaScore: 'score = min(100, d\u00e9calage moyen \u00f7 180 \u00d7 100)',
    contributionTitle: 'Contribution de chaque couleur',
    neutralIgnored: 'neutre \u2014 ignor\u00e9',
    avgWeightedShift: 'D\u00e9calage moyen pond\u00e9r\u00e9',
    scaleSmooth: 'transition douce',
    scaleModerate: 'mod\u00e9r\u00e9e',
    scaleMajor: 'majeure',
    hueShiftsPerColor: 'D\u00e9calages de teinte par couleur',
    neutralLabel: 'neutre',

    // Ambiances
    sectionAmbiances: 'Ambiances',
    atmosphereSubtitle: 'Applique une transformation d\'ambiance \u00e0 la palette pour pr\u00e9visualiser le rendu.',
    originalLabel: 'Original',

    // Aper\u00e7u photo
    previewPhoto: 'Aper\u00e7u photo',
    previewImage: 'Pr\u00e9visualisation sur l\'image',
    previewBefore: 'Avant',
    previewAfter: 'Apr\u00e8s',
    previewCapBefore: 'Image d\'origine.',
    previewCapAfter: 'Rendu simul\u00e9 : chaque zone re\u00e7oit le d\u00e9calage de teinte de la couleur la plus proche.',
    previewGenerate: 'G\u00e9n\u00e9ration de la pr\u00e9visualisation\u2026',
    previewError: 'Impossible de g\u00e9n\u00e9rer la pr\u00e9visualisation de l\'image.',
    previewFallback: 'Pr\u00e9visualisation de l\'image compl\u00e8te disponible sur la version web. Ici, comparez la palette d\'origine et la palette transform\u00e9e ci-dessus.',

    // Consignes de retouche
    guidanceTitle: 'Comment appliquer ces changements en retouche',
    mainTechnique: 'Technique principale',
    detailPerColor: 'D\u00e9tail par couleur',
    neutralDesaturated: 'Tons neutres / d\u00e9satur\u00e9s',
    colorBand: 'Gamme {name}',
    hideOtherTech: 'Masquer les autres techniques',
    showAllTech: 'Voir les 3 techniques',
    recommended: 'recommand\u00e9',
    softwareTitle: 'Logiciels compatibles (liste non exhaustive)',
    softwareFree: 'gratuit',
    softwareNote: 'Les noms d\'outils varient selon les versions et les langues.',

    // Export
    exportTitle: 'Exporter l\'analyse',
    exportHint: 'Rapport structur\u00e9 (couleurs, harmonie, disruption, consignes de retouche) et exports JSON, CSS, SASS et CSV de la palette.',
    copyReport: 'Copier le rapport',
    reportCopied: 'Rapport copi\u00e9 !',
    exportJson: 'JSON',
    exportCss: 'CSS',
    exportSass: 'SASS',
    exportCsv: 'CSV',
    downloaded: 't\u00e9l\u00e9charg\u00e9 !',
    copied: 'copi\u00e9 !',

    // Erreurs
    errNoColors: 'Aucune couleur d\u00e9tect\u00e9e dans cette image.',
    errAnalysis: 'Erreur lors de l\'analyse de l\'image.',
    errGallery: 'Impossible d\'ouvrir la galerie.',
    errPermission: 'Autorisation d\'acc\u00e8s \u00e0 la galerie refus\u00e9e.',
    errInvalidFile: 'Veuillez fournir un fichier image valide.',
    errCopyReport: 'Impossible de copier le rapport.',
    errExportCsv: 'Impossible d\'exporter le CSV.',
    errExportJson: 'Impossible d\'exporter le JSON.',
    errExportCss: 'Impossible d\'exporter le CSS.',
    errExportSass: 'Impossible d\'exporter le SASS.',

    // Noms des sch\u00e9mas
    schemeMono: 'Monochromatique',
    schemeAnalog: 'Analogique',
    schemeCompl: 'Compl\u00e9mentaire',
    schemeSplit: 'Split-Compl\u00e9mentaire',
    schemeTriad: 'Triadique',
    schemeTetra: 'T\u00e9tradique (carr\u00e9)',
    schemeDoubleSplit: 'Double Split-Compl\u00e9mentaire',

    // Noms des ambiances
    atmoSummer: '\u00c9t\u00e9',
    atmoWinter: 'Hiver',
    atmoNostalgia: 'Nostalgie',
    atmoSepia: 'S\u00e9pia',
    atmoJoy: 'Joie',
    atmoSadness: 'Tristesse',
    atmoPastel: 'Pastel',
    atmoNeon: 'N\u00e9on',
    atmoVintage: 'Vintage',
    atmoMystery: 'Myst\u00e8re',

    // Techniques
    techTsl: 'TSL / HSL',
    techCurves: 'Courbes',
    techGrading: 'Color Grading',

    // Onboarding
    onb_skip: 'Passer',
    onb_next: 'Suivant',
    onb_start: 'C\'est parti !',
    onb_welcomeTitle: 'Bienvenue sur ColorAnalyze',
    onb_welcomeDesc: 'Votre studio d\'analyse chromatique de poche. Explorez les couleurs de vos images, trouvez des harmonies et cr\u00e9ez des ambiances — le tout 100% sur votre appareil.',
    onb_importTitle: 'Importez une image',
    onb_importDesc: 'Choisissez une photo depuis votre galerie ou glissez-d\u00e9posez une image. L\'analyse d\u00e9marre en un instant et extrait les couleurs dominantes automatiquement.',
    onb_paletteTitle: 'Palette & Roue chromatique',
    onb_paletteDesc: '\u00c9ditez la palette extraite, fusionnez ou supprimez des couleurs. Visualisez-les sur la roue chromatique en mode RGB, CMY ou RYB.',
    onb_harmonyTitle: 'Harmonies & Ambiances',
    onb_harmonyDesc: 'D\u00e9couvrez le sch\u00e9ma de couleurs d\u00e9tect\u00e9, explorez des alternatives, et appliquez des filtres d\'ambiance. Recevez des consignes de retouche pr\u00e9cises.',
    onb_privacyTitle: 'Vos donn\u00e9es restent priv\u00e9es',
    onb_privacyDesc: 'Aucune image n\'est envoy\u00e9e \u00e0 un serveur. Le traitement est enti\u00e8rement local. Pas de compte, pas de pistage, pas de publicit\u00e9.',

    // Legal / \u00c0 propos
    legal_title: '\u00c0 propos',
    legal_tagline: 'Analyse chromatique 100% locale',
    legal_rate: '\u00c9valuer',
    legal_contact: 'Contact',
    legal_reportBug: 'Signaler',
    legal_privacyTitle: 'Politique de confidentialit\u00e9',
    legal_privacyIntro: 'ColorAnalyze respecte votre vie priv\u00e9e. Cette politique d\u00e9crit comment l\'application traite (ou plut\u00f4t ne traite pas) vos donn\u00e9es personnelles.',
    legal_dataCollectedTitle: 'Donn\u00e9es collect\u00e9es',
    legal_dataCollectedBody: 'ColorAnalyze ne collecte aucune donn\u00e9e personnelle. Aucune image, palette, historique d\'utilisation ni identifiant n\'est envoy\u00e9 \u00e0 un serveur distant. Le traitement des couleurs est r\u00e9alis\u00e9 enti\u00e8rement sur votre appareil (navigateur ou application mobile).',
    legal_dataStorageTitle: 'Stockage local',
    legal_dataStorageBody: 'Seul un indicateur de premier lancement est stock\u00e9 localement (AsyncStorage / localStorage) pour ne pas r\u00e9afficher la visite guid\u00e9e. Aucune autre donn\u00e9e n\'est persist\u00e9e. \u00c0 la fermeture de l\'application, l\'\u00e9tat est perdu.',
    legal_thirdPartyTitle: 'Services tiers',
    legal_thirdPartyBody: 'Aucun service tiers d\'analyse, de publicit\u00e9, de suivi ou de t\u00e9l\u00e9m\u00e9trie n\'est utilis\u00e9. Aucune biblioth\u00e8que tierce ne transmet de donn\u00e9es hors de l\'appareil.',
    legal_childrenTitle: 'Enfants',
    legal_childrenBody: 'L\'application ne collecte aucune donn\u00e9e et convient \u00e0 tous les \u00e2ges. Elle ne contient ni publicit\u00e9, ni achat int\u00e9gr\u00e9, ni contenu inappropri\u00e9.',
    legal_changesTitle: 'Modifications',
    legal_changesBody: 'Cette politique peut \u00eatre mise \u00e0 jour. La date de derni\u00e8re r\u00e9vision est indiqu\u00e9e ci-dessous. L\'utilisation de l\'application apr\u00e8s modification vaut acceptation.',
    legal_privacyDate: 'Derni\u00e8re mise \u00e0 jour : septembre 2026',
    legal_termsTitle: 'Conditions d\'utilisation',
    legal_termsBody: 'ColorAnalyze est fourni \u00ab tel quel \u00bb, sans garantie d\'aucune sorte. L\'application est un outil d\'aide \u00e0 l\'analyse chromatique et ne se substitue pas \u00e0 un jugement professionnel. Les r\u00e9sultats d\'analyse (sch\u00e9mas, scores, consignes) sont indicatifs. L\'utilisateur est seul responsable de l\'usage qu\'il fait des r\u00e9sultats. L\'\u00e9diteur ne saurait \u00eatre tenu responsable de tout dommage li\u00e9 \u00e0 l\'utilisation de l\'application.',
    legal_creditsTitle: 'Cr\u00e9dits & licences',
    legal_creditsBody: 'ColorAnalyze est construit avec les technologies open-source suivantes :',
    legal_supportTitle: 'Support & contact',
    legal_supportBody: 'Pour toute question, signalement de bug ou suggestion d\'am\u00e9lioration, contactez-nous par e-mail. Nous r\u00e9pondons g\u00e9n\u00e9ralement sous 48 heures.',
    legal_notice: 'Application ind\u00e9pendante. Traitement int\u00e9gralement local. Aucune donn\u00e9e personnelle collect\u00e9e.',
  },
  en: {
    // General
    appName: 'ColorAnalyze',
    langMenu: 'Language',
    langLabel: 'EN',
    langFR: 'Fran\u00e7ais',
    langEN: 'English',
    subtitle: 'Analyze the colors of an image: palette, color wheel, harmonies and atmospheres.',
    footer: '100% local processing \u00b7 no data sent.',

    // Import
    importImage: 'Import an image',
    importAnother: 'Choose another image',
    dropHintWeb: 'Drag and drop an image here, or click to browse',
    dropHintMobile: 'Tap to choose a photo or screenshot',
    analyzing: 'Analyzing colors\u2026',

    // Privacy
    privacyNote: 'Privacy: the image and pixels stay on your device. The app does not save any image, palette or history. No analysis, telemetry or data is sent to any server or third-party service. Exports are initiated by you and leave the app only via the download, share or clipboard you choose. Without persistent storage, the state disappears on close or refresh; no server-side deletion is needed.',

    // Tabs
    tabPalette: 'Palette & Wheel',
    tabHarmony: 'Harmonies',
    tabAtmosphere: 'Atmospheres',

    // Palette
    paletteExtracted: 'Extracted palette',
    colorsLabel: 'Colors',
    resetPalette: 'Reset',
    resetPaletteA11y: 'Reset palette',
    mergeColors: 'Merge {n} colors',
    deleteColorA11y: 'Delete this color',
    lessColorsA11y: 'Fewer colors',
    moreColorsA11y: 'More colors',
    paletteHint: 'Select colors to merge them, or delete them. Percentages are recalculated and propagated to the wheel, harmonies and atmospheres.',

    // Color wheel
    wheelCaption: 'Angle = hue \u00b7 Distance from center = saturation \u00b7 Size = importance',
    wheelExplainTitle: 'Why do RGB, CMY and RYB differ?',
    wheelExplainIntro: 'The same color is not placed at the same angle depending on the model, because each model defines different primaries and thus divides the color circle differently.',
    wheelRgbDesc: 'additive light mixing (screens, photography). Primaries: red, green, blue.',
    wheelCmyDesc: 'subtractive ink mixing (printing). Primaries: cyan, magenta, yellow; the wheel is essentially the opposite of the RGB wheel.',
    wheelRybDesc: 'traditional artist model (painting). Primaries: red, yellow, blue.',
    wheelExplainConclusion: 'Consequence: a color\'s complement changes from model to model. Red\'s complement is cyan in RGB, but green in RYB. Comparing the three wheels helps choose consistent color agreements for your medium (screen, print, painting).',

    // Harmonies
    detectedScheme: 'Detected scheme',
    exploreSchemes: 'Explore other schemes',
    confidence: 'Confidence',
    hueFamilies: 'Hue families',
    neutrals: 'Neutrals',
    transformTo: 'Transform to \u00ab {name} \u00bb',
    disruptionScore: 'Disruption score',
    calcTitle: 'How is this score calculated?',
    calcExplain: 'The score measures the extent of the editing required to achieve this scheme. The hue shift of each color is calculated, then a weighted average by the surface area (%) that the color occupies in the image is computed. Neutral tones are ignored.',
    hueShiftLabel: 'Hue shift',
    weightedSurface: 'surface',
    weightedAvg: 'weighted average by surface',
    formulaAvg: 'avg shift = \u03a3(|shift\u00b0| \u00d7 surface%) \u00f7 \u03a3surface%',
    formulaScore: 'score = min(100, avg shift \u00f7 180 \u00d7 100)',
    contributionTitle: 'Contribution of each color',
    neutralIgnored: 'neutral \u2014 ignored',
    avgWeightedShift: 'Weighted average shift',
    scaleSmooth: 'smooth transition',
    scaleModerate: 'moderate',
    scaleMajor: 'major',
    hueShiftsPerColor: 'Hue shifts per color',
    neutralLabel: 'neutral',

    // Atmospheres
    sectionAmbiances: 'Atmospheres',
    atmosphereSubtitle: 'Apply an atmosphere transformation to the palette to preview the result.',
    originalLabel: 'Original',

    // Photo preview
    previewPhoto: 'Photo preview',
    previewImage: 'Preview on image',
    previewBefore: 'Before',
    previewAfter: 'After',
    previewCapBefore: 'Original image.',
    previewCapAfter: 'Simulated render: each area receives the hue shift of the closest color.',
    previewGenerate: 'Generating preview\u2026',
    previewError: 'Unable to generate the image preview.',
    previewFallback: 'Full image preview available on the web version. Here, compare the original and transformed palettes above.',

    // Editing guidance
    guidanceTitle: 'How to apply these changes in editing',
    mainTechnique: 'Main technique',
    detailPerColor: 'Detail per color',
    neutralDesaturated: 'Neutral / desaturated tones',
    colorBand: '{name} range',
    hideOtherTech: 'Hide other techniques',
    showAllTech: 'Show all 3 techniques',
    recommended: 'recommended',
    softwareTitle: 'Compatible software (non-exhaustive list)',
    softwareFree: 'free',
    softwareNote: 'Tool names vary by version and language.',

    // Export
    exportTitle: 'Export the analysis',
    exportHint: 'Structured report (colors, harmony, disruption, editing guidance) and JSON, CSS, SASS and CSV palette exports.',
    copyReport: 'Copy report',
    reportCopied: 'Report copied!',
    exportJson: 'JSON',
    exportCss: 'CSS',
    exportSass: 'SASS',
    exportCsv: 'CSV',
    downloaded: 'downloaded!',
    copied: 'copied!',

    // Errors
    errNoColors: 'No colors detected in this image.',
    errAnalysis: 'Error analyzing the image.',
    errGallery: 'Unable to open the gallery.',
    errPermission: 'Gallery access permission denied.',
    errInvalidFile: 'Please provide a valid image file.',
    errCopyReport: 'Unable to copy the report.',
    errExportCsv: 'Unable to export CSV.',
    errExportJson: 'Unable to export JSON.',
    errExportCss: 'Unable to export CSS.',
    errExportSass: 'Unable to export SASS.',

    // Scheme names
    schemeMono: 'Monochromatic',
    schemeAnalog: 'Analogous',
    schemeCompl: 'Complementary',
    schemeSplit: 'Split-Complementary',
    schemeTriad: 'Triadic',
    schemeTetra: 'Tetradic (square)',
    schemeDoubleSplit: 'Double Split-Complementary',

    // Atmosphere names
    atmoSummer: 'Summer',
    atmoWinter: 'Winter',
    atmoNostalgia: 'Nostalgia',
    atmoSepia: 'Sepia',
    atmoJoy: 'Joy',
    atmoSadness: 'Sadness',
    atmoPastel: 'Pastel',
    atmoNeon: 'Neon',
    atmoVintage: 'Vintage',
    atmoMystery: 'Mystery',

    // Techniques
    techTsl: 'HSL',
    techCurves: 'Curves',
    techGrading: 'Color Grading',

    // Onboarding
    onb_skip: 'Skip',
    onb_next: 'Next',
    onb_start: 'Get started!',
    onb_welcomeTitle: 'Welcome to ColorAnalyze',
    onb_welcomeDesc: 'Your pocket color analysis studio. Explore the colors of your images, find harmonies and create moods — all 100% on your device.',
    onb_importTitle: 'Import an image',
    onb_importDesc: 'Choose a photo from your gallery or drag and drop an image. Analysis starts instantly and extracts dominant colors automatically.',
    onb_paletteTitle: 'Palette & Color Wheel',
    onb_paletteDesc: 'Edit the extracted palette, merge or delete colors. Visualize them on the color wheel in RGB, CMY or RYB mode.',
    onb_harmonyTitle: 'Harmonies & Atmospheres',
    onb_harmonyDesc: 'Discover the detected color scheme, explore alternatives, and apply atmosphere filters. Get precise editing guidance.',
    onb_privacyTitle: 'Your data stays private',
    onb_privacyDesc: 'No image is sent to any server. Processing is entirely local. No account, no tracking, no ads.',

    // Legal / About
    legal_title: 'About',
    legal_tagline: '100% local color analysis',
    legal_rate: 'Rate',
    legal_contact: 'Contact',
    legal_reportBug: 'Report',
    legal_privacyTitle: 'Privacy Policy',
    legal_privacyIntro: 'ColorAnalyze respects your privacy. This policy describes how the app processes (or rather does not process) your personal data.',
    legal_dataCollectedTitle: 'Data collected',
    legal_dataCollectedBody: 'ColorAnalyze does not collect any personal data. No image, palette, usage history or identifier is sent to a remote server. Color processing is performed entirely on your device (browser or mobile app).',
    legal_dataStorageTitle: 'Local storage',
    legal_dataStorageBody: 'Only a first-launch indicator is stored locally (AsyncStorage / localStorage) to avoid re-showing the onboarding tour. No other data is persisted. When the app is closed, the state is lost.',
    legal_thirdPartyTitle: 'Third-party services',
    legal_thirdPartyBody: 'No third-party analytics, advertising, tracking or telemetry service is used. No third-party library transmits data off the device.',
    legal_childrenTitle: 'Children',
    legal_childrenBody: 'The app does not collect any data and is suitable for all ages. It contains no ads, in-app purchases, or inappropriate content.',
    legal_changesTitle: 'Changes',
    legal_changesBody: 'This policy may be updated. The last revision date is shown below. Continued use of the app after changes constitutes acceptance.',
    legal_privacyDate: 'Last updated: September 2026',
    legal_termsTitle: 'Terms of Use',
    legal_termsBody: 'ColorAnalyze is provided \"as is\", without warranty of any kind. The app is a color analysis aid and does not replace professional judgment. Analysis results (schemes, scores, guidance) are indicative. The user is solely responsible for the use of the results. The publisher shall not be liable for any damage related to the use of the app.',
    legal_creditsTitle: 'Credits & licenses',
    legal_creditsBody: 'ColorAnalyze is built with the following open-source technologies:',
    legal_supportTitle: 'Support & contact',
    legal_supportBody: 'For any question, bug report or improvement suggestion, contact us by email. We typically respond within 48 hours.',
    legal_notice: 'Independent application. Entirely local processing. No personal data collected.',
  },
};

// ---------------------------------------------------------------------------
// React Context
// ---------------------------------------------------------------------------

const LangContext = createContext({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('fr');

  const t = useCallback(
    (key, params = {}) => {
      const dict = LANG[lang] || LANG.fr;
      let s = dict[key] ?? LANG.fr[key] ?? key;
      Object.entries(params).forEach(([k, v]) => {
        s = s.replace(`{${k}}`, v);
      });
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export const languages = Object.keys(LANG);
