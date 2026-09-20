// lib/report.js
// Génération d'un rapport texte structuré (français) et d'un export CSV des
// couleurs, à partir de l'analyse courante. 100% JS pur.

import { computeSchemeTransform } from './colorHarmony';
import { applyAtmosphere, ATMOSPHERES } from './atmospheres';
import { buildEditingGuidance } from './editingGuidance';

// Libellés des techniques (synchronisés avec editingGuidance.js).
const TECH_LABELS = { tsl: 'TSL / HSL', courbes: 'Courbes', colorGrading: 'Color Grading' };

function line(char = '─', n = 44) {
  return char.repeat(n);
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

/** Export CSV des couleurs (séparateur ; pour compatibilité Excel FR). */
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
