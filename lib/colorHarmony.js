// lib/colorHarmony.js
// Détection du schéma de couleurs et calcul des schémas alternatifs.

import { hueDistance, hslToHex } from './colorConversions';

/**
 * Définition des schémas d'harmonie : angles de HUE relatifs (par rapport à une couleur de base).
 */
export const SCHEMES = {
  monochromatique: { label: 'Monochromatique', offsets: [0] },
  analogique: { label: 'Analogique', offsets: [-30, 0, 30] },
  complementaire: { label: 'Complémentaire', offsets: [0, 180] },
  splitComplementaire: { label: 'Split-Complémentaire', offsets: [0, 150, 210] },
  triadique: { label: 'Triadique', offsets: [0, 120, 240] },
  tetradique: { label: 'Tétradique (carré)', offsets: [0, 90, 180, 270] },
  doubleSplit: {
    label: 'Double Split-Complémentaire',
    offsets: [0, 30, 180, 210],
  },
};

/**
 * Regroupe les HUE des couleurs (pondérées par %) en groupes distincts,
 * pour raisonner sur les "familles" de teintes plutôt que sur chaque couleur.
 * @param {Array} colors - sortie de extractDominantColors
 * @param {number} tolerance - seuil de regroupement en degrés
 */
export function clusterHues(colors, tolerance = 22) {
  // On ignore les couleurs quasi-neutres (saturation très faible) pour la teinte.
  const chromatic = colors.filter((c) => c.hsl.s > 12 && c.hsl.l > 6 && c.hsl.l < 96);
  const groups = [];
  for (const c of chromatic) {
    let placed = false;
    for (const g of groups) {
      if (hueDistance(g.hue, c.hsl.h) <= tolerance) {
        // moyenne pondérée par le pourcentage
        const wTotal = g.weight + c.percent;
        // gestion du wrap-around : on ajuste l'angle
        let gh = g.hue;
        let ch = c.hsl.h;
        if (Math.abs(gh - ch) > 180) {
          if (gh < ch) gh += 360;
          else ch += 360;
        }
        g.hue = (((gh * g.weight + ch * c.percent) / wTotal) % 360 + 360) % 360;
        g.weight = wTotal;
        g.members.push(c);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ hue: c.hsl.h, weight: c.percent, members: [c] });
    }
  }
  groups.sort((a, b) => b.weight - a.weight);
  return groups;
}

/**
 * Détecte le schéma de couleurs le plus probable à partir des groupes de teintes.
 * @returns {{key, label, score, hueGroups, neutralRatio, details}}
 */
export function detectScheme(colors, tolerance = 25) {
  const groups = clusterHues(colors, tolerance);
  const chromaticWeight = groups.reduce((s, g) => s + g.weight, 0);
  const totalWeight = colors.reduce((s, c) => s + c.percent, 0);
  const neutralRatio = totalWeight > 0 ? 1 - chromaticWeight / totalWeight : 1;

  const n = groups.length;

  // Cas dégénérés
  if (n === 0) {
    return {
      key: 'monochromatique',
      label: 'Monochromatique (neutre)',
      score: 1,
      hueGroups: groups,
      neutralRatio,
      details: 'Image majoritairement composée de tons neutres (gris/beige).',
    };
  }
  if (n === 1) {
    // Distinguer monochromatique vs analogique selon l'étalement interne
    const hues = groups[0].members.map((m) => m.hsl.h);
    const spread = Math.max(...hues) - Math.min(...hues);
    if (spread > 15) {
      return buildResult('analogique', 0.85, groups, neutralRatio, 'Teintes proches et voisines sur la roue.');
    }
    return buildResult('monochromatique', 0.95, groups, neutralRatio, 'Une seule famille de teintes, variations de saturation/luminosité.');
  }

  // Calcul des écarts entre les groupes principaux (triés par poids)
  const mainHues = groups.map((g) => g.hue);

  // Évalue chaque schéma candidat par rapport aux groupes détectés
  const candidates = [];
  for (const [key, def] of Object.entries(SCHEMES)) {
    const score = scoreSchemeAgainstGroups(def.offsets, mainHues, groups);
    candidates.push({ key, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  let detail = '';
  switch (best.key) {
    case 'complementaire':
      detail = 'Deux familles de teintes opposées (~180°).';
      break;
    case 'splitComplementaire':
      detail = 'Une teinte de base et les deux voisines de sa complémentaire.';
      break;
    case 'triadique':
      detail = 'Trois teintes réparties à ~120° sur la roue.';
      break;
    case 'tetradique':
      detail = 'Quatre teintes formant un carré (~90°).';
      break;
    case 'doubleSplit':
      detail = 'Deux paires de teintes voisines et opposées.';
      break;
    case 'analogique':
      detail = 'Teintes voisines sur la roue chromatique.';
      break;
    default:
      detail = 'Variations autour d\'une teinte dominante.';
  }

  return buildResult(best.key, best.score, groups, neutralRatio, detail);
}

function buildResult(key, score, groups, neutralRatio, details) {
  return {
    key,
    label: SCHEMES[key].label,
    score,
    hueGroups: groups,
    neutralRatio,
    details,
  };
}

/**
 * Note (0-1) la correspondance d'un ensemble de HUE détectés avec un schéma.
 */
function scoreSchemeAgainstGroups(offsets, mainHues, groups) {
  // On aligne le schéma sur la teinte du groupe dominant (offset[0] = base).
  const base = groups[0].hue;
  const targets = offsets.map((o) => (base + o + 360) % 360);

  // Chaque groupe pondéré doit trouver une cible proche.
  let matchedWeight = 0;
  let totalWeight = 0;
  const usedTargets = new Set();
  for (const g of groups) {
    totalWeight += g.weight;
    let bestErr = Infinity;
    let bestIdx = -1;
    for (let i = 0; i < targets.length; i++) {
      const err = hueDistance(g.hue, targets[i]);
      if (err < bestErr) {
        bestErr = err;
        bestIdx = i;
      }
    }
    // score de proximité : 1 si aligné, décroît jusqu'à 0 à 40°
    const proximity = Math.max(0, 1 - bestErr / 40);
    matchedWeight += proximity * g.weight;
    usedTargets.add(bestIdx);
  }

  let score = totalWeight > 0 ? matchedWeight / totalWeight : 0;

  // Pénalité si le nombre de familles ne correspond pas au nombre de cibles.
  const nGroups = groups.length;
  const nTargets = offsets.length;
  const countPenalty = 1 - Math.min(1, Math.abs(nGroups - nTargets) * 0.18);
  score *= countPenalty;

  // Bonus si on couvre bien les cibles distinctes attendues.
  const coverage = usedTargets.size / nTargets;
  score *= 0.7 + 0.3 * Math.min(1, coverage);

  return score;
}

/**
 * Calcule, pour un schéma cible, les HUE idéaux et le décalage nécessaire pour
 * chaque couleur de la palette, ainsi qu'un score global de disruption.
 *
 * @param {Array} colors - palette extraite (avec percent + hsl)
 * @param {string} targetKey - clé du schéma cible
 * @returns {{key,label,mappings,disruption,advice}}
 */
export function computeSchemeTransform(colors, targetKey) {
  const def = SCHEMES[targetKey];
  const groups = clusterHues(colors, 25);
  const base = groups.length > 0 ? groups[0].hue : (colors[0] ? colors[0].hsl.h : 0);
  const targets = def.offsets.map((o) => (base + o + 360) % 360);

  // Pour chaque couleur, on trouve la cible la plus proche et le décalage HUE.
  const mappings = colors.map((c) => {
    // couleurs neutres : peu affectées
    const isNeutral = c.hsl.s <= 12;
    let bestErr = Infinity;
    let targetHue = c.hsl.h;
    for (const t of targets) {
      const err = hueDistance(c.hsl.h, t);
      if (err < bestErr) {
        bestErr = err;
        targetHue = t;
      }
    }
    const newHsl = isNeutral ? { ...c.hsl } : { ...c.hsl, h: targetHue };
    return {
      original: c,
      shift: isNeutral ? 0 : signedHueShift(c.hsl.h, targetHue),
      newHsl,
      newHex: hslToHex(newHsl),
      isNeutral,
    };
  });

  // Disruption pondérée : décalage moyen (en °) pondéré par le % de chaque couleur.
  let weighted = 0;
  let totalPercent = 0;
  for (const m of mappings) {
    weighted += Math.abs(m.shift) * m.original.percent;
    totalPercent += m.original.percent;
  }
  const avgShift = totalPercent > 0 ? weighted / totalPercent : 0;
  const disruption = Math.min(100, (avgShift / 180) * 100);

  let advice;
  if (disruption < 12) {
    advice = 'Transition douce : la palette est déjà proche de ce schéma.';
  } else if (disruption < 35) {
    advice = 'Changement modéré : ajustements visibles mais harmonieux.';
  } else {
    advice = 'Changement majeur recommandé avec précaution : les couleurs dominantes doivent beaucoup se déplacer, le rendu sera très différent de l\'original.';
  }

  return {
    key: targetKey,
    label: def.label,
    mappings,
    disruption,
    avgShift,
    advice,
  };
}

/** Décalage signé le plus court de a vers b (en degrés, -180..180). */
function signedHueShift(a, b) {
  let d = ((b - a + 540) % 360) - 180;
  return d;
}
