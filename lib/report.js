// lib/report.js
// Génération d'un rapport texte structuré (français) et d'un export CSV des
// couleurs, à partir de l'analyse courante. 100% JS pur.

import { computeSchemeTransform, SCHEMES } from './colorHarmony';
import { applyAtmosphere, ATMOSPHERES } from './atmospheres';
import { buildEditingGuidance } from './editingGuidance';

// Libellés des techniques (synchronisés avec editingGuidance.js).
const TECH_LABELS = { tsl: 'TSL / HSL', courbes: 'Courbes', colorGrading: 'Color Grading' };

function line(char = '─', n = 44) {
  return char.repeat(n);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function colorForExport(c) {
  return {
    hex: c.hex.toUpperCase(),
    rgb: { r: c.rgb.r, g: c.rgb.g, b: c.rgb.b },
    hsl: {
      h: round(c.hsl.h, 0),
      s: round(c.hsl.s),
      l: round(c.hsl.l),
    },
    percent: round(c.percent),
  };
}

function detectedForExport(detected) {
  if (!detected) return null;
  return {
    key: detected.key,
    label: detected.label,
    score: round(detected.score, 2),
    neutralRatio: round(detected.neutralRatio, 2),
    details: detected.details || '',
    hueGroups: (detected.hueGroups || []).map((group) => ({
      hue: round(group.hue, 0),
      weight: round(group.weight),
      memberCount: (group.members || []).length,
    })),
  };
}

function harmonyForExport(colors, harmonyKey) {
  if (!harmonyKey || !SCHEMES[harmonyKey]) return null;
  const transform = computeSchemeTransform(colors, harmonyKey);
  return {
    key: transform.key,
    label: transform.label,
    disruption: round(transform.disruption),
    avgShiftDegrees: round(transform.avgShift),
    advice: transform.advice,
    mappings: transform.mappings.map((mapping) => ({
      from: mapping.original.hex.toUpperCase(),
      to: mapping.newHex.toUpperCase(),
      shiftDegrees: round(mapping.shift, 0),
      percent: round(mapping.original.percent),
      neutral: mapping.isNeutral,
    })),
  };
}

function atmosphereForExport(colors, atmosphereKey) {
  const atmosphere = ATMOSPHERES.find((item) => item.key === atmosphereKey);
  if (!atmosphere) return null;
  const preview = applyAtmosphere(colors, atmosphereKey);
  return {
    key: atmosphere.key,
    label: atmosphere.label,
    description: atmosphere.description || '',
    mappings: preview.map((mapping) => ({
      from: mapping.original.hex.toUpperCase(),
      to: mapping.newHex.toUpperCase(),
      percent: round(mapping.percent != null ? mapping.percent : mapping.original.percent),
    })),
  };
}

/** Construit une analyse structurée et stable, exploitable hors de l'application. */
export function buildAnalysis({ colors = [], detected, harmonyKey = null, atmosphereKey = null }) {
  return {
    format: 'coloranalyze.analysis',
    version: 1,
    colors: colors.map(colorForExport),
    detected: detectedForExport(detected),
    harmony: harmonyForExport(colors, harmonyKey),
    atmosphere: atmosphereForExport(colors, atmosphereKey),
  };
}

/** Export JSON de l'analyse courante. */
export function buildJson(args) {
  return JSON.stringify(buildAnalysis(args), null, 2);
}

/** Variables CSS pour la palette courante. */
export function buildCss(colors = []) {
  const declarations = [
    `  --color-count: ${colors.length};`,
    ...colors.flatMap((c, i) => [
      `  --color-${i + 1}: ${c.hex.toUpperCase()};`,
      `  --color-${i + 1}-rgb: ${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b};`,
      `  --color-${i + 1}-hsl: ${Math.round(c.hsl.h)}, ${Math.round(c.hsl.s)}%, ${Math.round(c.hsl.l)}%;`,
      `  --color-${i + 1}-percent: ${c.percent.toFixed(1)}%;`,
    ]),
  ];
  return `:root {\n${declarations.join('\n')}\n}\n`;
}

/** Variables SASS pour la palette courante. */
export function buildSass(colors = []) {
  const declarations = [
    `$color-count: ${colors.length};`,
    ...colors.flatMap((c, i) => [
      `$color-${i + 1}: ${c.hex.toUpperCase()};`,
      `$color-${i + 1}-rgb: (${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b});`,
      `$color-${i + 1}-hsl: (${Math.round(c.hsl.h)}, ${Math.round(c.hsl.s)}%, ${Math.round(c.hsl.l)}%);`,
      `$color-${i + 1}-percent: ${c.percent.toFixed(1)}%;`,
    ]),
  ];
  return `${declarations.join('\n')}\n`;
}

function fmtColor(c, i) {
  const rgb = `RGB(${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b})`;
  const hsl = `HSL(${Math.round(c.hsl.h)}°, ${Math.round(c.hsl.s)}%, ${Math.round(c.hsl.l)}%)`;
  return `  ${i + 1}. ${c.hex.toUpperCase()}  ·  ${rgb}  ·  ${hsl}  ·  ${c.percent.toFixed(1)}%`;
}

function guidanceToText(transforms, context) {
  const { perColor, summary } = buildEditingGuidance(transforms, { context });
  const out = [];
  out.push(`  Technique principale recommandée : ${summary.recommendedGlobalLabel}`);
  out.push(
    `  Répartition : TSL/HSL ${summary.breakdown.tsl}% · Courbes ${summary.breakdown.courbes}% · Color Grading ${summary.breakdown.colorGrading}%`
  );
  out.push(`  ${summary.text}`);
  out.push('');
  for (const pc of perColor) {
    const deltas = `Δteinte ${Math.round(pc.deltas.h)}° · Δsat ${Math.round(pc.deltas.s)} · Δlum ${Math.round(pc.deltas.l)}`;
    out.push(
      `  ${pc.hexOrigine.toUpperCase()} → ${pc.hexCible.toUpperCase()} (${pc.pourcentage.toFixed(1)}%) — ${pc.band.label}`
    );
    out.push(`     Recommandé : ${TECH_LABELS[pc.recommended]} · ${deltas}`);
    out.push(`     ${pc.techniques[pc.recommended].text}`);
  }
  return out.join('\n');
}

/**
 * Construit le rapport texte complet.
 * @param {Object} args
 * @param {Array} args.colors - palette courante
 * @param {Object} args.detected - schéma détecté (detectScheme)
 * @param {string|null} args.harmonyKey - schéma cible sélectionné (facultatif)
 * @param {string|null} args.atmosphereKey - ambiance sélectionnée (facultatif)
 * @returns {string}
 */
export function buildReport({ colors = [], detected, harmonyKey = null, atmosphereKey = null }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR');
  const out = [];

  out.push('RAPPORT COLORANALYZE');
  out.push(line('═'));
  out.push(`Généré le ${dateStr} · Analyse 100% locale (aucune donnée envoyée)`);
  out.push('');

  // Couleurs
  out.push('PALETTE DE COULEURS');
  out.push(line());
  colors.forEach((c, i) => out.push(fmtColor(c, i)));
  out.push('');

  // Harmonie détectée
  if (detected) {
    out.push('HARMONIE DÉTECTÉE');
    out.push(line());
    out.push(`  Schéma : ${detected.label}`);
    out.push(`  Confiance : ${Math.round(detected.score * 100)}%`);
    out.push(`  Familles de teintes : ${detected.hueGroups ? detected.hueGroups.length : '—'}`);
    if (detected.neutralRatio > 0.15) {
      out.push(`  Part de tons neutres : ${Math.round(detected.neutralRatio * 100)}%`);
    }
    if (detected.details) out.push(`  ${detected.details}`);
    out.push('');
  }

  // Transformation vers un schéma d'harmonie cible
  if (harmonyKey) {
    const tr = computeSchemeTransform(colors, harmonyKey);
    out.push(`TRANSFORMATION VERS « ${tr.label.toUpperCase()} »`);
    out.push(line());
    out.push(`  Score de disruption : ${Math.round(tr.disruption)}%`);
    out.push(`  ${tr.advice}`);
    out.push('  Déplacements de teinte :');
    tr.mappings.forEach((m) => {
      const shift = m.isNeutral ? 'neutre' : `${m.shift > 0 ? '+' : ''}${Math.round(m.shift)}°`;
      out.push(`    ${m.original.hex.toUpperCase()} → ${m.newHex.toUpperCase()} (${m.original.percent.toFixed(1)}%) · ${shift}`);
    });
    out.push('');
    out.push('  CONSIGNES DE RETOUCHE');
    const transforms = tr.mappings.map((m) => ({
      hexOrigine: m.original.hex,
      hexCible: m.newHex,
      hslOrigine: m.original.hsl,
      hslCible: m.newHsl,
      pourcentage: m.original.percent,
    }));
    out.push(guidanceToText(transforms, 'harmony'));
    out.push('');
  }

  // Transformation vers une ambiance
  if (atmosphereKey) {
    const atmo = ATMOSPHERES.find((a) => a.key === atmosphereKey);
    const preview = applyAtmosphere(colors, atmosphereKey);
    out.push(`AMBIANCE « ${(atmo ? atmo.label : atmosphereKey).toUpperCase()} »`);
    out.push(line());
    if (atmo && atmo.description) out.push(`  ${atmo.description}`);
    out.push('  Nouvelles couleurs :');
    preview.forEach((p) => {
      out.push(`    ${p.original.hex.toUpperCase()} → ${p.newHex.toUpperCase()} (${p.percent.toFixed(1)}%)`);
    });
    out.push('');
    out.push('  CONSIGNES DE RETOUCHE');
    const transforms = preview.map((p) => ({
      hexOrigine: p.original.hex,
      hexCible: p.newHex,
      hslOrigine: p.original.hsl,
      hslCible: p.newHsl,
      pourcentage: p.percent != null ? p.percent : p.original.percent,
    }));
    out.push(guidanceToText(transforms, 'atmosphere'));
    out.push('');
  }

  out.push(line('═'));
  out.push('Généré avec ColorAnalyze — traitement entièrement sur l\'appareil.');
  return out.join('\n');
}

export async function saveAnalysis(id, analysis) {
  if (typeof localStorage === 'undefined') return;
  const key = 'ca_analysis_' + id;
  localStorage.setItem(key, JSON.stringify({ ts: Date.now(), ...analysis }));
}

export async function loadAnalysis(id) {
  if (typeof localStorage === 'undefined') return null;
  const key = 'ca_analysis_' + id;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export async function listAnalyses() {
  if (typeof localStorage === 'undefined') return [];
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ca_analysis_')) out.push(k.replace('ca_analysis_', ''));
  }
  return out;
}
export function buildCsv(colors = []) {
  const rows = [['index', 'hex', 'r', 'g', 'b', 'h', 's', 'l', 'pourcentage']];
  colors.forEach((c, i) => {
    rows.push([
      i + 1,
      c.hex.toUpperCase(),
      c.rgb.r,
      c.rgb.g,
      c.rgb.b,
      Math.round(c.hsl.h),
      Math.round(c.hsl.s),
      Math.round(c.hsl.l),
      c.percent.toFixed(1),
    ]);
  });
  return rows.map((r) => r.join(';')).join('\n');
}
