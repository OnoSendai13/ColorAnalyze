// lib/imageRecolor.js
// Re-teinte des pixels d'une image en fonction d'un mapping palette origine->cible.
// 100% JS pur (pas de canvas ici) : consomme/produit des données RGBA brutes.
//
// Principe : pour chaque pixel, on trouve la couleur de palette la plus proche
// (distance RGB), puis on applique le décalage HSL (Δteinte, Δsaturation,
// Δluminosité) associé à cette couleur. Ce décalage PRÉSERVE la texture et les
// variations locales de l'image (contrairement à un simple aplat de la couleur
// cible), pour un rendu avant/après réaliste.

import { rgbToHsl, hslToRgb } from './colorConversions';

/** Décalage de teinte signé le plus court a->b (en °, -180..180). */
function signedHueShift(a, b) {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/**
 * Pré-calcule les décalages HSL pour chaque couleur de la palette.
 * @param {Array} mappings - liste de { rgb{r,g,b} (origine), hslOrigine{h,s,l}, hslCible{h,s,l} }
 * @returns {Array} anchors [{ r,g,b, dH, dS, dL }]
 */
export function buildAnchors(mappings) {
  return (mappings || [])
    .filter((m) => m && m.rgb && m.hslOrigine && m.hslCible)
    .map((m) => ({
      r: m.rgb.r,
      g: m.rgb.g,
      b: m.rgb.b,
      dH: signedHueShift(m.hslOrigine.h, m.hslCible.h),
      dS: m.hslCible.s - m.hslOrigine.s,
      dL: m.hslCible.l - m.hslOrigine.l,
    }));
}

/**
 * Re-teinte un buffer RGBA en place-copie.
 * @param {Uint8ClampedArray|Array} data - RGBA source (non modifié)
 * @param {Array} mappings - voir buildAnchors
 * @returns {Uint8ClampedArray} nouveau buffer RGBA transformé
 */
export function recolorRGBA(data, mappings) {
  const anchors = buildAnchors(mappings);
  const out = new Uint8ClampedArray(data.length);
  if (!anchors.length) {
    out.set(data);
    return out;
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Couleur d'ancrage la plus proche (distance RGB au carré).
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < anchors.length; k++) {
      const dr = r - anchors[k].r;
      const dg = g - anchors[k].g;
      const db = b - anchors[k].b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    const anc = anchors[best];
    const hsl = rgbToHsl({ r, g, b });
    const newHsl = {
      h: ((hsl.h + anc.dH) % 360 + 360) % 360,
      s: Math.max(0, Math.min(100, hsl.s + anc.dS)),
      l: Math.max(0, Math.min(100, hsl.l + anc.dL)),
    };
    const rgb = hslToRgb(newHsl);
    out[i] = rgb.r;
    out[i + 1] = rgb.g;
    out[i + 2] = rgb.b;
    out[i + 3] = a;
  }
  return out;
}
