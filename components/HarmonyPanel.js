// components/HarmonyPanel.js
// Panneau des harmonies : schéma détecté + boutons alternatifs + visualisation
// des décalages HUE et score de disruption.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SCHEMES, computeSchemeTransform } from '../lib/colorHarmony';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import EditingGuidance from './EditingGuidance';

function DisruptionBar({ value, theme, styles }) {
  let color = theme.success;
  if (value >= 35) color = theme.danger;
  else if (value >= 12) color = theme.warning;
  return (
    <View style={styles.disWrap}>
      <View style={styles.disTrack}>
        <View style={[styles.disFill, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.disValue, { color }]}>{Math.round(value)}%</Text>
    </View>
  );
}

export default function HarmonyPanel({ colors = [], detected }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState(null);

  if (!colors.length || !detected) return null;

  const transform = selected ? computeSchemeTransform(colors, selected) : null;

  // Couples origine->cible normalisés pour les consignes de retouche.
  const guidanceTransforms = transform
    ? transform.mappings.map((m) => ({
        hexOrigine: m.original.hex,
        hexCible: m.newHex,
        hslOrigine: m.original.hsl,
        hslCible: m.newHsl,
        pourcentage: m.original.percent,
      }))
    : [];

  return (
    <View style={styles.wrap}>
      <View style={styles.detectedCard}>
        <Text style={styles.detectedLabel}>Schéma détecté</Text>
        <Text style={styles.detectedName}>{detected.label}</Text>
        <Text style={styles.detectedDetail}>{detected.details}</Text>
        <Text style={styles.confidence}>
          Confiance : {Math.round(detected.score * 100)}% · Familles de teintes : {detected.hueGroups.length}
          {detected.neutralRatio > 0.15
            ? ` · Neutres : ${Math.round(detected.neutralRatio * 100)}%`
            : ''}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Explorer d'autres schémas</Text>
      <View style={styles.btnRow}>
        {Object.entries(SCHEMES).map(([key, def]) => {
          const isActive = selected === key;
          const isDetected = detected.key === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(isActive ? null : key)}
              style={[
                styles.schemeBtn,
                isActive && styles.schemeBtnActive,
                isDetected && styles.schemeBtnDetected,
              ]}
            >
              <Text style={[styles.schemeTxt, isActive && styles.schemeTxtActive]}>
                {def.label}
                {isDetected ? ' ✓' : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {transform && (
        <View style={styles.transformCard}>
          <Text style={styles.transformTitle}>Transformation vers « {transform.label} »</Text>

          <Text style={styles.disLabel}>Score de disruption</Text>
          <DisruptionBar value={transform.disruption} theme={theme} styles={styles} />
          <Text style={styles.advice}>{transform.advice}</Text>

          <Text style={styles.mapTitle}>Décalages de teinte par couleur</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {transform.mappings.map((m, i) => (
              <View key={i} style={styles.mapItem}>
                <View style={styles.mapSwatches}>
                  <View style={[styles.mapChip, { backgroundColor: m.original.hex }]}>
                    <Text style={[styles.mapChipTxt, { color: readableTextColor(m.original.hex) }]}>
                      {Math.round(m.original.percent)}%
                    </Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                  <View style={[styles.mapChip, { backgroundColor: m.newHex }]} />
                </View>
                <Text style={styles.shiftTxt}>
                  {m.isNeutral
                    ? 'neutre'
                    : `${m.shift > 0 ? '+' : ''}${Math.round(m.shift)}°`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {transform && (
        <EditingGuidance transforms={guidanceTransforms} context="harmony" />
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    detectedCard: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 16,
      padding: 18,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: t.border,
    },
    detectedLabel: {
      color: t.accentSecondary,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
    },
    detectedName: { color: t.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 6 },
    detectedDetail: { color: t.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
    confidence: { color: t.textMuted, fontSize: 11, marginTop: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: t.textPrimary, marginBottom: 10 },
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    schemeBtn: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: t.surface,
      borderWidth: 1.5,
      borderColor: t.border,
    },
    schemeBtnActive: { backgroundColor: t.accent, borderColor: t.accent },
    schemeBtnDetected: { borderColor: t.accentSecondary },
    schemeTxt: { fontSize: 12, fontWeight: '700', color: t.textSecondary },
    schemeTxtActive: { color: t.accentOnText },
    transformCard: {
      marginTop: 18,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: t.border,
    },
    transformTitle: { fontSize: 15, fontWeight: '800', color: t.textPrimary, marginBottom: 14 },
    disLabel: { fontSize: 12, color: t.textSecondary, marginBottom: 6 },
    disWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    disTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: t.surfaceMuted, overflow: 'hidden' },
    disFill: { height: 12, borderRadius: 6 },
    disValue: { fontSize: 13, fontWeight: '800', width: 44, textAlign: 'right' },
    advice: { fontSize: 12, color: t.textSecondary, marginTop: 10, lineHeight: 17 },
    mapTitle: { fontSize: 13, fontWeight: '800', color: t.textPrimary, marginTop: 16 },
    mapItem: { alignItems: 'center', marginRight: 14 },
    mapSwatches: { flexDirection: 'row', alignItems: 'center' },
    mapChip: {
      width: 36,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.swatchBorder,
    },
    mapChipTxt: { fontSize: 9, fontWeight: '800' },
    arrow: { marginHorizontal: 5, color: t.textMuted, fontSize: 14 },
    shiftTxt: { fontSize: 11, color: t.textSecondary, marginTop: 5, fontWeight: '700' },
  });
}
