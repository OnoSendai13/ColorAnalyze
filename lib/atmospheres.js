// lib/atmospheres.js
// Transformations d'ambiance appliquées à une palette (manipulation HSL).

import { clamp, hslToHex } from './colorConversions';

/**
 * Chaque ambiance définit une transformation d'une couleur HSL.
 * Les fonctions reçoivent {h,s,l} et renvoient {h,s,l} transformé.
 */
export const ATMOSPHERES = [
  {
    key: 'ete',
    label: 'Été',
    emoji: '☀️',
    description: 'Couleurs chaudes, vives et lumineuses.',
    transform: ({ h, s, l }) => ({
      h: h + (h > 180 && h < 300 ? -12 : 6), // pousse vers les tons chauds
      s: clamp(s * 1.2 + 8, 0, 100),
      l: clamp(l * 1.02 + 4, 0, 100),
    }),
  },
  {
    key: 'hiver',
    label: 'Hiver',
    emoji: '❄️',
    description: 'Teintes froides, désaturées et claires.',
    transform: ({ h, s, l }) => ({
      h: h + (h < 60 || h > 300 ? 18 : 6), // pousse vers les bleus
      s: clamp(s * 0.7, 0, 100),
      l: clamp(l * 1.05 + 6, 0, 100),
    }),
  },
  {
    key: 'nostalgie',
    label: 'Nostalgie',
    emoji: '🎞️',
    description: 'Tons passés, légèrement chauds et adoucis.',
    transform: ({ h, s, l }) => ({
      h: h * 0.92 + 30 * 0.08, // tire doucement vers l'ambre
      s: clamp(s * 0.75, 0, 100),
      l: clamp(l * 0.98 + 6, 0, 100),
    }),
  },
  {
    key: 'sepia',
    label: 'Sépia',
    emoji: '🟤',
    description: 'Monochrome brun, style photo ancienne.',
    transform: ({ l }) => ({
      h: 32,
      s: 42,
      l: clamp(l * 0.85 + 8, 0, 100),
    }),
  },
  {
    key: 'joie',
    label: 'Joie',
    emoji: '😊',
    description: 'Saturation élevée, couleurs éclatantes.',
    transform: ({ h, s, l }) => ({
      h,
      s: clamp(s * 1.35 + 12, 0, 100),
      l: clamp(l * 1.05 + 5, 0, 100),
    }),
  },
  {
    key: 'tristesse',
    label: 'Tristesse',
    emoji: '💧',
    description: 'Tons froids, sombres et désaturés.',
    transform: ({ h, s, l }) => ({
      h: h + (h < 200 ? 20 : 0),
      s: clamp(s * 0.55, 0, 100),
      l: clamp(l * 0.82, 0, 100),
    }),
  },
  {
    key: 'pastel',
    label: 'Pastel',
    emoji: '🍭',
    description: 'Couleurs douces, claires et poudrées.',
    transform: ({ h, s, l }) => ({
      h,
      s: clamp(s * 0.6, 15, 55),
      l: clamp(Math.max(l, 70) + 8, 0, 94),
    }),
  },
  {
    key: 'neon',
    label: 'Néon',
    emoji: '⚡',
    description: 'Couleurs électriques ultra-saturées.',
    transform: ({ h, s, l }) => ({
      h,
      s: clamp(Math.max(s, 80) + 15, 0, 100),
      l: clamp(50 + (l - 50) * 0.4, 42, 62),
    }),
  },
  {
    key: 'vintage',
    label: 'Vintage',
    emoji: '📻',
    description: 'Teintes délavées façon rétro années 70.',
    transform: ({ h, s, l }) => ({
      h: h + 8,
      s: clamp(s * 0.65, 0, 60),
      l: clamp(l * 0.92 + 8, 0, 88),
    }),
  },
  {
    key: 'mystere',
    label: 'Mystère',
    emoji: '🌑',
    description: 'Ambiance sombre, profonde et froide.',
    transform: ({ h, s, l }) => ({
      h: h + (h < 260 ? 25 : 0),
      s: clamp(s * 0.8, 0, 80),
      l: clamp(l * 0.6, 4, 55),
    }),
  },
];

/**
 * Applique une ambiance à une palette complète.
 * @param {Array} colors - palette extraite (avec hsl + percent + hex)
 * @param {string} atmosphereKey
 * @returns {Array<{original, newHsl, newHex, percent}>}
 */
export function applyAtmosphere(colors, atmosphereKey) {
  const atmo = ATMOSPHERES.find((a) => a.key === atmosphereKey);
  if (!atmo) return colors.map((c) => ({ original: c, newHsl: c.hsl, newHex: c.hex, percent: c.percent }));
  return colors.map((c) => {
    const newHsl = normalizeHsl(atmo.transform({ ...c.hsl }));
    return {
      original: c,
      newHsl,
      newHex: hslToHex(newHsl),
      percent: c.percent,
    };
  });
}

function normalizeHsl({ h, s, l }) {
  return {
    h: ((h % 360) + 360) % 360,
    s: clamp(s, 0, 100),
    l: clamp(l, 0, 100),
  };
}
