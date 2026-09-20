// lib/colorAnalysis.js
// Extraction des couleurs dominantes via k-means en JS pur.

import { rgbToHex, rgbToHsl } from './colorConversions';

/** Distance euclidienne au carré entre deux points RGB. */
function dist2(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Initialisation k-means++ pour des centres bien répartis.
 */
function kmeansPlusPlusInit(pixels, k, rng) {
  const centers = [];
  centers.push(pixels[Math.floor(rng() * pixels.length)]);
  while (centers.length < k) {
    const distances = pixels.map((p) => {
      let min = Infinity;
      for (const c of centers) {
        const d = dist2(p, c);
        if (d < min) min = d;
      }
      return min;
    });
    const total = distances.reduce((s, d) => s + d, 0);
    if (total === 0) break;
    let target = rng() * total;
    let idx = 0;
    for (let i = 0; i < distances.length; i++) {
      target -= distances[i];
      if (target <= 0) {
        idx = i;
        break;
      }
    }
    centers.push(pixels[idx]);
  }
  return centers.map((c) => [...c]);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour des résultats stables. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Exécute k-means sur un tableau de pixels [[r,g,b], ...].
 * Retourne { clusters: [{center, count}], inertia }.
 */
function runKmeans(pixels, k, maxIter = 20, seed = 42) {
  const rng = makeRng(seed);
  let centers = kmeansPlusPlusInit(pixels, k, rng);
  k = centers.length;
  let assignments = new Array(pixels.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // Assignation
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(pixels[i], centers[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    // Mise à jour
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const a = assignments[i];
      sums[a][0] += pixels[i][0];
      sums[a][1] += pixels[i][1];
      sums[a][2] += pixels[i][2];
      sums[a][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centers[c] = [
          sums[c][0] / sums[c][3],
          sums[c][1] / sums[c][3],
          sums[c][2] / sums[c][3],
        ];
      }
    }
    if (!changed && iter > 0) break;
  }

  // Comptage et inertie finale
  const counts = new Array(k).fill(0);
  let inertia = 0;
  for (let i = 0; i < pixels.length; i++) {
    const a = assignments[i];
    counts[a] += 1;
    inertia += dist2(pixels[i], centers[a]);
  }

  const clusters = [];
  for (let c = 0; c < k; c++) {
    if (counts[c] > 0) clusters.push({ center: centers[c], count: counts[c] });
  }
  return { clusters, inertia: inertia / pixels.length };
}

/**
 * Détermine dynamiquement le nombre optimal de couleurs (méthode du coude simplifiée).
 * @param {Array} pixels
 * @param {number} minK
 * @param {number} maxK
 */
function chooseOptimalK(pixels, minK, maxK) {
  const results = {};
  for (let k = minK; k <= maxK; k++) {
    results[k] = runKmeans(pixels, k, 15, 42);
  }
  const inertias = [];
  for (let k = minK; k <= maxK; k++) inertias.push(results[k].inertia);

  // Méthode du coude : point le plus éloigné de la droite (premier -> dernier).
  let bestK = minK;
  let bestDist = -1;
  const x1 = 0;
  const y1 = inertias[0];
  const x2 = inertias.length - 1;
  const y2 = inertias[inertias.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const norm = Math.sqrt(dx * dx + dy * dy) || 1;
  for (let i = 0; i < inertias.length; i++) {
    const x0 = i;
    const y0 = inertias[i];
    const d = Math.abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm;
    if (d > bestDist) {
      bestDist = d;
      bestK = minK + i;
    }
  }
  return { bestK, result: results[bestK] };
}

/**
 * Extrait les couleurs dominantes à partir de données de pixels RGBA (Uint8ClampedArray / tableau).
 *
 * @param {Uint8ClampedArray|Array} data - données RGBA (longueur multiple de 4)
 * @param {Object} options
 * @param {number} options.minColors - nb minimum de couleurs (défaut 5)
 * @param {number} options.maxColors - nb maximum de couleurs (défaut 10)
 * @param {number|null} options.forceK - force un nombre précis (ignore l'auto)
 * @param {number} options.sampleStep - échantillonnage des pixels (défaut 1)
 * @returns {Array<{hex, rgb, hsl, percent, count}>} trié par pourcentage décroissant
 */
export function extractDominantColors(data, options = {}) {
  const {
    minColors = 5,
    maxColors = 10,
    forceK = null,
    sampleStep = 1,
  } = options;

  const pixels = [];
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const alpha = data[i + 3];
    if (alpha !== undefined && alpha < 125) continue; // ignore les pixels transparents
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (pixels.length === 0) return [];

  let result;
  if (forceK) {
    result = runKmeans(pixels, forceK, 20, 42);
  } else {
    const hi = Math.min(maxColors, pixels.length);
    const lo = Math.min(minColors, hi);
    const chosen = chooseOptimalK(pixels, lo, hi);
    result = chosen.result;
  }

  const total = result.clusters.reduce((s, c) => s + c.count, 0);
  const colors = result.clusters.map((c) => {
    const rgb = {
      r: Math.round(c.center[0]),
      g: Math.round(c.center[1]),
      b: Math.round(c.center[2]),
    };
    return {
      rgb,
      hex: rgbToHex(rgb),
      hsl: rgbToHsl(rgb),
      count: c.count,
      percent: (c.count / total) * 100,
    };
  });
  colors.sort((a, b) => b.percent - a.percent);
  return colors;
}
