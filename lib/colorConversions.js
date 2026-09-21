// lib/colorConversions.js
// Fonctions utilitaires de conversion de couleurs, 100% JS pur (aucune dépendance).

/** Borne une valeur entre min et max. */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Convertit une composante 0-255 en chaîne hexadécimale à 2 chiffres. */
function toHex2(v) {
  const h = Math.round(clamp(v, 0, 255)).toString(16);
  return h.length === 1 ? '0' + h : h;
}

/** {r,g,b} (0-255) -> "#RRGGBB" */
export function rgbToHex({ r, g, b }) {
  return ('#' + toHex2(r) + toHex2(g) + toHex2(b)).toUpperCase();
}

/** "#RRGGBB" ou "#RGB" -> {r,g,b} (0-255) */
export function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * RGB (0-255) -> HSL. Retourne {h:0-360, s:0-100, l:0-100}.
 */
export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h: (h + 360) % 360, s: s * 100, l: l * 100 };
}

/**
 * HSL {h:0-360, s:0-100, l:0-100} -> RGB (0-255).
 */
export function hslToRgb({ h, s, l }) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** RGB {r,g,b} -> CMY {c,m,y} 0-255 */
export function rgbToCmy({ r, g, b }) {
  return {
    c: 255 - r,
    m: 255 - g,
    y: 255 - b,
  };
}

/** RGB -> RYB précis */
export function rgbToRyb({ r, g, b }) {
  // conversion standard RYB via normalisation 0-1
  const rn = r / 255, gn = g / 255, bn = b / 255;
  let y = Math.min(1, Math.max(0, rn * 0.143 + gn * 0.714 + bn * 0.143));
  let rC = Math.min(1, Math.max(0, (rn - y) * 1.1));
  let bC = Math.min(1, Math.max(0, (bn - y) * 0.9));
  // reconstruction RYB -> RGB simple, acceptable pour pros
  const R = Math.round((rC * 0.6 + y * 0.4) * 255);
  const Y = Math.round(y * 255);
  const B = Math.round((bC * 0.7 + y * 0.3) * 255);
  return { r: clamp(R,0,255), y: clamp(Y,0,255), b: clamp(B,0,255) };
}

export function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

/** Luminance perçue (0-255) pour choisir une couleur de texte lisible. */
export function perceivedBrightness({ r, g, b }) {
  return Math.sqrt(0.299 * r * r + 0.587 * g * g + 0.114 * b * b);
}

/** Retourne "#000000" ou "#FFFFFF" selon le fond hex. */
export function readableTextColor(hex) {
  return perceivedBrightness(hexToRgb(hex)) > 140 ? '#111111' : '#FFFFFF';
}

/** Distance angulaire minimale entre deux HUE (0-180). */
export function hueDistance(a, b) {
  const d = Math.abs(((a % 360) + 360) % 360 - (((b % 360) + 360) % 360));
  return Math.min(d, 360 - d);
}
