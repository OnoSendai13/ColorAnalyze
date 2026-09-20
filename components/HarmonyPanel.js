// components/HarmonyPanel.js
// Panneau des harmonies : schéma détecté + boutons alternatifs + visualisation
// des décalages HUE et score de disruption.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SCHEMES, computeSchemeTransform } from '../lib/colorHarmony';
import { readableTextColor } from '../lib/colorConversions';

function DisruptionBar({ value }) {
  let color = '#3BA55D';
  if (value >= 35) color = '#E23D3D';
  else if (value >= 12) color = '#E0A100';
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
  const [selected, setSelected] = useState(null);

  if (!colors.length || !detected) return null;

  const transform = selected ? computeSchemeTransform(colors, selected) : null;

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
          <DisruptionBar value={transform.disruption} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  detectedCard: {
    backgroundColor: '#1E1E24',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  detectedLabel: { color: '#9AA', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  detectedName: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 4 },
  detectedDetail: { color: '#CDD', fontSize: 13, marginTop: 6 },
  confidence: { color: '#889', fontSize: 11, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 8 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  schemeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEE',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  schemeBtnActive: { backgroundColor: '#333' },
  schemeBtnDetected: { borderColor: '#3BA55D' },
  schemeTxt: { fontSize: 12, fontWeight: '600', color: '#444' },
  schemeTxtActive: { color: '#FFF' },
  transformCard: {
    marginTop: 16,
    backgroundColor: '#F6F6F8',
    borderRadius: 14,
    padding: 16,
  },
  transformTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 12 },
  disLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  disWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: '#E2E2E6', overflow: 'hidden' },
  disFill: { height: 12, borderRadius: 6 },
  disValue: { fontSize: 13, fontWeight: '700', width: 44, textAlign: 'right' },
  advice: { fontSize: 12, color: '#555', marginTop: 10, lineHeight: 17 },
  mapTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 16 },
  mapItem: { alignItems: 'center', marginRight: 14 },
  mapSwatches: { flexDirection: 'row', alignItems: 'center' },
  mapChip: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0002',
  },
  mapChipTxt: { fontSize: 9, fontWeight: '700' },
  arrow: { marginHorizontal: 4, color: '#999', fontSize: 14 },
  shiftTxt: { fontSize: 11, color: '#666', marginTop: 4, fontWeight: '600' },
});
