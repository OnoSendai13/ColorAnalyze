// lib/paletteEdit.js
// Édition de la palette extraite : suppression, fusion et renormalisation des %.
// 100% JS pur (aucune dépendance native) — réutilisable web + mobile.
//
// Toutes les fonctions renvoient une NOUVELLE palette (immutabilité) dont les
// pourcentages totalisent 100%. Chaque couleur conserve la forme produite par
// extractDominantColors : { rgb{r,g,b}, hex, hsl{h,s,l}, count, percent }.

import { rgbToHex, rgbToHsl } from './colorConversions';

/** Recalcule les pourcentages pour qu'ils totalisent exactement 100%. */
export function renormalize(colors) {
  const total = colors.reduce((s, c) => s + (c.percent || 0), 0);
  if (total <= 0) {
    // Répartition égale si aucune information de pourcentage.
    const eq = colors.length ? 100 / colors.length : 0;
    return colors.map((c) => ({ ...c, percent: eq }));
  }
  return colors.map((c) => ({ ...c, percent: ((c.percent || 0) / total) * 100 }));
}

/** Reconstruit hex + hsl à partir d'un rgb (utile après une fusion). */
function withDerived(rgb, rest) {
  const r = { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) };
  return { ...rest, rgb: r, hex: rgbToHex(r), hsl: rgbToHsl(r) };
}

/**
 * Supprime la couleur à l'index donné, puis renormalise.
 * Retourne la palette d'origine (renormalisée) si la suppression laisserait < 2 couleurs.
 */
export function deleteColorAt(colors, index) {
  if (!Array.isArray(colors) || colors.length <= 2) return renormalize(colors);
  if (index < 0 || index >= colors.length) return renormalize(colors);
  const next = colors.filter((_, i) => i !== index);
  return renormalize(next);
}

/**
 * Fusionne les couleurs aux index fournis en une seule couleur :
 * - RGB = moyenne pondérée par le % de chaque couleur (mélange perçu approché) ;
 * - % = somme des % fusionnés.
 * La couleur fusionnée prend la position de la première sélection.
 * Puis renormalise l'ensemble.
 */
export function mergeColorsAt(colors, indices) {
  if (!Array.isArray(colors)) return colors;
  const uniq = [...new Set(indices)].filter((i) => i >= 0 && i < colors.length);
  if (uniq.length < 2) return renormalize(colors);

  const sel = uniq.map((i) => colors[i]);
  const weightSum = sel.reduce((s, c) => s + (c.percent || 0), 0) || sel.length;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (const c of sel) {
    const w = (c.percent || 0) || weightSum / sel.length;
    r += c.rgb.r * w;
    g += c.rgb.g * w;
    b += c.rgb.b * w;
    count += c.count || 0;
  }
  const merged = withDerived(
    { r: r / weightSum, g: g / weightSum, b: b / weightSum },
    { count, percent: sel.reduce((s, c) => s + (c.percent || 0), 0) }
  );

  const firstPos = Math.min(...uniq);
  const toRemove = new Set(uniq);
  const next = [];
  for (let i = 0; i < colors.length; i++) {
    if (i === firstPos) next.push(merged);
    else if (!toRemove.has(i)) next.push(colors[i]);
  }
  return renormalize(next);
}
