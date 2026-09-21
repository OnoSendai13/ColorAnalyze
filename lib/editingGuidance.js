// lib/editingGuidance.js
// Traduction d'une transformation couleur (origine -> cible) en CONSIGNES DE
// RETOUCHE actionnables et GÉNÉRIQUES (indépendantes d'un logiciel précis).
//
// Les logiciels de retouche travaillent le plus souvent selon trois familles
// d'outils :
//   1. TSL / HSL (Teinte-Saturation-Luminance par gamme de couleur) : le plus
//      direct et le plus sélectif — idéal pour un décalage de teinte ciblé.
//   2. Courbes (par canal RVB et par zone tonale) : idéal pour les dominantes
//      globales, le contraste et les casts de couleur.
//   3. Color Grading / Étalonnage (roues Ombres / Tons moyens / Hautes lumières) :
//      idéal pour poser une ambiance / une dominante de mood.
//
// Ce module NE recalcule aucune logique métier : il consomme les couples
// origine->cible déjà produits par colorHarmony.js et atmospheres.js.
//
// 100% JS pur, aucune dépendance native — réutilisable côté web et mobile.

// ---------------------------------------------------------------------------
// Bandes de teinte nommées (façon panneau TSL de Lightroom), en français.
// ---------------------------------------------------------------------------

const HUE_BANDS = [
  { key: 'rouge', label: 'Rouge', min: 345, max: 360 },
  { key: 'rouge2', label: 'Rouge', min: 0, max: 15 },
  { key: 'orange', label: 'Orange', min: 15, max: 45 },
  { key: 'jaune', label: 'Jaune', min: 45, max: 70 },
  { key: 'vert', label: 'Vert', min: 70, max: 160 },
  { key: 'cyan', label: 'Cyan / Aqua', min: 160, max: 200 },
  { key: 'bleu', label: 'Bleu', min: 200, max: 260 },
  { key: 'violet', label: 'Violet / Pourpre', min: 260, max: 300 },
  { key: 'magenta', label: 'Magenta / Rose', min: 300, max: 345 },
];

const NEUTRAL_SAT = 12; // en dessous : couleur considérée quasi neutre / désaturée

/** Retourne la bande de teinte nommée pour une teinte donnée (0-360). */
export function hueBand(h) {
  const hue = ((h % 360) + 360) % 360;
  for (const b of HUE_BANDS) {
    if (hue >= b.min && hue < b.max) return { key: b.key, label: b.label };
  }
  return { key: 'rouge', label: 'Rouge' };
}

/** Température perçue d'une teinte : + = chaud (rouge/orange), − = froid (cyan/bleu). */
function warmth(h) {
  const hue = ((h % 360) + 360) % 360;
  // Pic de chaleur ~40° (orange), pic de froid ~220° (bleu).
  return Math.cos(((hue - 40) * Math.PI) / 180);
}

/** Zone tonale d'une luminosité (0-100). */
function tonalZone(l) {
  if (l < 34) return 'les ombres';
  if (l < 67) return 'les tons moyens';
  return 'les hautes lumières';
}

/** Décalage de teinte signé le plus court a->b (en °, -180..180). */
function signedHueShift(a, b) {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/** Qualifie l'ampleur d'un delta selon des seuils. */
function magnitude(value, thresholds) {
  const v = Math.abs(value);
  if (v < thresholds[0]) return 'négligeable';
  if (v < thresholds[1]) return 'faible';
  if (v < thresholds[2]) return 'modéré';
  return 'fort';
}

/** Formate un nombre signé (+/−) sans décimale superflue. */
function signed(n) {
  const r = Math.round(n);
  if (r === 0) return '0';
  return (r > 0 ? '+' : '−') + Math.abs(r);
}

// ---------------------------------------------------------------------------
// Consignes par technique, pour une transformation unitaire.
// ---------------------------------------------------------------------------

function buildTslInstruction({ isNeutral, band, dH, dS, dL }) {
  if (isNeutral) {
    return {
      applicable: false,
      text:
        'Couleur quasi neutre / désaturée : le panneau TSL n\'a pas de prise fiable. Privilégier les Courbes ou le Color Grading.',
    };
  }
  const parts = [];
  parts.push(`Teinte ${signed(dH)}`);
  parts.push(`Saturation ${signed(dS)}`);
  parts.push(`Luminance ${signed(dL)}`);
  return {
    applicable: true,
    text: `Panneau TSL → gamme ${band.label} : ${parts.join(', ')}.`,
  };
}

function buildCurvesInstruction({ dWarmth, dL, zoneOrigine }) {
  const gestures = [];
  // Dominante chromatique traduite en canaux RVB (approche par température).
  if (Math.abs(dWarmth) > 0.06) {
    if (dWarmth > 0) {
      gestures.push(`Courbe Rouge : relever légèrement sur ${zoneOrigine}`);
      gestures.push(`Courbe Bleu : abaisser légèrement sur ${zoneOrigine}`);
    } else {
      gestures.push(`Courbe Bleu : relever légèrement sur ${zoneOrigine}`);
      gestures.push(`Courbe Rouge : abaisser légèrement sur ${zoneOrigine}`);
    }
  }
  // Luminosité globale.
  if (Math.abs(dL) >= 4) {
    gestures.push(
      `Courbe RVB (maître) : ${dL > 0 ? 'relever' : 'abaisser'} ${zoneOrigine}`
    );
  }
  if (!gestures.length) {
    gestures.push('Ajustement de courbe négligeable pour cette couleur.');
  }
  return { applicable: true, text: gestures.join(' · ') };
}

function buildColorGradingInstruction({ isNeutral, bandCible, dWarmth, dS, zoneOrigine }) {
  const parts = [];
  const tempWord =
    dWarmth > 0.06 ? 'réchauffer' : dWarmth < -0.06 ? 'refroidir' : null;
  // Roue de la zone tonale concernée.
  if (!isNeutral) {
    parts.push(`Roue ${zoneOrigine} → pousser vers ${bandCible.label}`);
  } else if (tempWord) {
    parts.push(`Roue ${zoneOrigine} → ${tempWord} la dominante`);
  }
  if (tempWord && !isNeutral) {
    parts.push(`${tempWord} l'ensemble`);
  }
  if (Math.abs(dS) >= 8) {
    parts.push(dS > 0 ? 'renforcer la saturation globale' : 'atténuer la saturation globale');
  }
  if (!parts.length) {
    parts.push('Étalonnage discret : la dominante change peu.');
  }
  return { applicable: true, text: parts.join(' · ') };
}

// ---------------------------------------------------------------------------
// Choix de la technique recommandée pour une transformation unitaire.
// ---------------------------------------------------------------------------

function recommendTechnique({ isNeutral, dH, dS, dL, satOrigine }, context) {
  // Couleur neutre : pas de prise TSL.
  if (isNeutral) {
    // Ajout d'une teinte (dominante) -> Color Grading ; sinon variation de
    // luminosité/contraste -> Courbes.
    if (Math.abs(dL) >= Math.abs(dS)) return 'courbes';
    return 'colorGrading';
  }

  const hueMag = Math.abs(dH); // 0..180
  const satMag = Math.abs(dS); // 0..100
  const lumMag = Math.abs(dL); // 0..100

  // Rotation de teinte marquée sur une couleur saturée identifiable -> TSL.
  if (hueMag >= 10 && satOrigine > 20) {
    return 'tsl';
  }
  // Peu de rotation : c'est surtout de la luminosité/contraste -> Courbes.
  if (hueMag < 10 && lumMag >= satMag && lumMag >= 6) {
    return 'courbes';
  }
  // Peu de rotation mais surtout de la saturation -> TSL (saturation par gamme).
  if (hueMag < 10 && satMag > lumMag && satMag >= 6) {
    return 'tsl';
  }
  // Ambiances : les décalages homogènes de dominante penchent Color Grading.
  if (context === 'atmosphere' && hueMag >= 6) {
    return 'colorGrading';
  }
  // Repli : la teinte bouge un peu sur couleur peu saturée -> Color Grading.
  return hueMag >= 6 ? 'colorGrading' : 'courbes';
}

const TECHNIQUE_LABELS = {
  tsl: 'TSL / HSL',
  courbes: 'Courbes',
  colorGrading: 'Color Grading',
};

// ---------------------------------------------------------------------------
// API principale.
// ---------------------------------------------------------------------------

/**
 * @param {Array} transforms - liste de { hexOrigine, hexCible, hslOrigine{h,s,l},
 *   hslCible{h,s,l}, pourcentage }
 * @param {Object} [options] - { context: 'harmony' | 'atmosphere' }
 * @returns {{ perColor: Array, summary: Object }}
 */
export function buildEditingGuidance(transforms, options = {}) {
  const context = options.context || 'harmony';
  const list = Array.isArray(transforms) ? transforms.filter(Boolean) : [];

  const perColor = list.map((tr) => {
    const o = tr.hslOrigine || { h: 0, s: 0, l: 0 };
    const c = tr.hslCible || o;
    const satOrigine = o.s;
    const isNeutral = satOrigine <= NEUTRAL_SAT && c.s <= NEUTRAL_SAT + 6;

    const dH = isNeutral ? 0 : signedHueShift(o.h, c.h);
    const dS = c.s - o.s;
    const dL = c.l - o.l;
    const dWarmth = warmth(c.h) - warmth(o.h);

    const band = hueBand(o.h);
    const bandCible = hueBand(c.h);
    const zoneOrigine = tonalZone(o.l);

    const directions = [];
    if (!isNeutral && Math.abs(dH) >= 3) {
      directions.push({
        label: `Teinte ${signed(dH)}° (vers ${bandCible.label})`,
        level: magnitude(dH, [8, 25, 60]),
      });
    }
    if (Math.abs(dS) >= 3) {
      directions.push({
        label: `Saturation ${signed(dS)}`,
        level: magnitude(dS, [5, 15, 30]),
      });
    }
    if (Math.abs(dL) >= 3) {
      directions.push({
        label: `Luminosité ${signed(dL)}`,
        level: magnitude(dL, [5, 15, 30]),
      });
    }
    if (!directions.length) {
      directions.push({ label: 'Changement négligeable', level: 'négligeable' });
    }

    const techniques = {
      tsl: buildTslInstruction({ isNeutral, band, dH, dS, dL }),
      courbes: buildCurvesInstruction({ dWarmth, dL, zoneOrigine }),
      colorGrading: buildColorGradingInstruction({
        isNeutral,
        bandCible,
        dWarmth,
        dS,
        zoneOrigine,
      }),
    };

    const recommended = recommendTechnique(
      { isNeutral, dH, dS, dL, satOrigine },
      context
    );

    return {
      hexOrigine: tr.hexOrigine,
      hexCible: tr.hexCible,
      pourcentage: tr.pourcentage != null ? tr.pourcentage : 0,
      isNeutral,
      band,
      bandCible,
      deltas: { h: dH, s: dS, l: dL },
      directions,
      techniques,
      recommended,
      recommendedLabel: TECHNIQUE_LABELS[recommended],
    };
  });

  const summary = buildSummary(perColor, context);
  return { perColor, summary };
}

/**
 * Résumé global : quelle PART revient à quelle technique (pondérée par le %
 * de chaque couleur), technique recommandée en priorité, et texte prêt à lire.
 */
function buildSummary(perColor, context) {
  const totals = { tsl: 0, courbes: 0, colorGrading: 0 };
  let totalWeight = 0;
  const tslBands = new Map();

  // Homogénéité de la dominante : direction (température) moyenne pondérée.
  let warmthSum = 0;
  let warmthWeight = 0;

  for (const pc of perColor) {
    const w = Math.max(0.0001, pc.pourcentage);
    totals[pc.recommended] += w;
    totalWeight += w;
    if (pc.recommended === 'tsl' && !pc.isNeutral) {
      tslBands.set(pc.band.label, (tslBands.get(pc.band.label) || 0) + w);
    }
    if (!pc.isNeutral) {
      // signe de dWarmth approximé par le signe du delta de teinte agrégé
      warmthSum += Math.sign(pc.deltas.h) * w;
      warmthWeight += w;
    }
  }

  const pct = (v) => (totalWeight > 0 ? Math.round((v / totalWeight) * 100) : 0);
  const breakdown = {
    tsl: pct(totals.tsl),
    courbes: pct(totals.courbes),
    colorGrading: pct(totals.colorGrading),
  };

  // Technique globale recommandée = part majoritaire.
  let recommendedGlobal = 'tsl';
  let best = -1;
  for (const k of ['tsl', 'courbes', 'colorGrading']) {
    if (totals[k] > best) {
      best = totals[k];
      recommendedGlobal = k;
    }
  }

  // Gammes TSL les plus concernées (triées par poids).
  const bands = [...tslBands.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  // Détection d'une dominante homogène (typique des ambiances) -> Color Grading.
  const homogeneous =
    warmthWeight > 0 && Math.abs(warmthSum) / warmthWeight > 0.6;

  // Construction du texte de synthèse.
  const parts = [];
  const mainLabel = TECHNIQUE_LABELS[recommendedGlobal];
  if (recommendedGlobal === 'tsl') {
    parts.push(
      bands.length
        ? `L'essentiel se fait au panneau TSL (gammes ${bands.slice(0, 3).join(', ')}).`
        : "L'essentiel se fait au panneau TSL."
    );
  } else if (recommendedGlobal === 'courbes') {
    parts.push('L\'essentiel se joue aux Courbes (luminosité, contraste, dominante).');
  } else {
    parts.push('L\'essentiel se joue au Color Grading (dominante d\'ensemble).');
  }

  // Complément.
  if (recommendedGlobal !== 'colorGrading' && (homogeneous || context === 'atmosphere')) {
    parts.push('Complément en Color Grading pour poser la dominante d\'ambiance.');
  } else if (recommendedGlobal !== 'tsl' && bands.length) {
    parts.push(`Ajustements ciblés au panneau TSL sur les gammes ${bands.slice(0, 2).join(', ')}.`);
  } else if (recommendedGlobal !== 'courbes' && breakdown.courbes >= 15) {
    parts.push('Un passage aux Courbes affine la luminosité et le contraste.');
  }

  return {
    recommendedGlobal,
    recommendedGlobalLabel: mainLabel,
    breakdown,
    bands,
    homogeneous,
    text: parts.join(' '),
  };
}

// ---------------------------------------------------------------------------
// Logiciels offrant ces fonctions (liste NON EXHAUSTIVE).
// ---------------------------------------------------------------------------

export function generateGuidance(paletteActuelle, intention, options = {}) {
  if (!Array.isArray(paletteActuelle) || paletteActuelle.length === 0) return { perColor: [], summary: { text: 'Palette vide' } };
  const { buildEditingGuidance } = await import('./editingGuidance.js');
  const transforms = paletteActuelle.map(c => {
    const h = c.hsl.h, s = c.hsl.s, l = c.hsl.l;
    // cible simplifiée : on applique l’intention comme un delta de teinte/lum/sat
    const delta = { h: 0, s: 0, l: 0 };
    if (intention === 'chaud') delta.h = 20;
    if (intention === 'froid') delta.h = -20;
    if (intention === 'clair') delta.l = 15;
    if (intention === 'sombre') delta.l = -15;
    return {
      hexOrigine: c.hex,
      hexCible: c.hex,
      hslOrigine: { h, s, l },
      hslCible: { h: (h + delta.h + 360) % 360, s: Math.max(0, Math.min(100, s + delta.s)), l: Math.max(0, Math.min(100, l + delta.l)) },
      pourcentage: c.percent || c.weight || 0,
    };
  });
  return buildEditingGuidance(transforms, { context: 'atmosphere' });
}

/**
  {
    name: 'Adobe Lightroom / Lightroom Classic',
    tools: 'Mixeur de couleurs (TSL), Courbe de tonalité, Étalonnage (roues)',
    free: false,
  },
  {
    name: 'Adobe Photoshop',
    tools: 'Teinte/Saturation, Courbes, Balance des couleurs, Correction sélective, Camera Raw',
    free: false,
  },
  {
    name: 'Capture One',
    tools: 'Éditeur de couleur, Courbes, Color Balance (roues)',
    free: false,
  },
  { name: 'Affinity Photo', tools: 'TSL, Courbes, Balance des couleurs', free: false },
  { name: 'DxO PhotoLab', tools: 'HSL, Courbe de tonalité, ClearView', free: false },
  { name: 'Darktable', tools: 'Zones de couleur, Courbe de base, Balance couleur RVB', free: true },
  { name: 'RawTherapee', tools: 'HSV/TSL, Courbes, Color Toning', free: true },
  { name: 'GIMP', tools: 'Teinte-Saturation, Courbes, Balance des couleurs', free: true },
  { name: 'DaVinci Resolve', tools: 'Roues chromatiques, Courbes, Hue vs Hue/Sat/Lum (vidéo)', free: true },
  { name: 'Snapseed (mobile)', tools: 'Réglages TSL, Courbes, Ambiance', free: true },
  { name: 'Lightroom Mobile', tools: 'Mixeur TSL, Courbes, Étalonnage', free: true },
  { name: 'VSCO (mobile)', tools: 'HSL, tons, ambiance', free: false },
];
