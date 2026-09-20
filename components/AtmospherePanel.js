// components/AtmospherePanel.js
// Panneau des ambiances : boutons + prévisualisation de la palette transformée.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ATMOSPHERES, applyAtmosphere } from '../lib/atmospheres';
import { readableTextColor } from '../lib/colorConversions';

export default function AtmospherePanel({ colors = [] }) {
  const [selected, setSelected] = useState(null);
  if (!colors.length) return null;

  const preview = selected ? applyAtmosphere(colors, selected) : null;
  const atmo = ATMOSPHERES.find((a) => a.key === selected);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Ambiances</Text>
      <Text style={styles.subtitle}>
        Applique une transformation d'ambiance à la palette pour prévisualiser le rendu.
      </Text>

      <View style={styles.btnRow}>
        {ATMOSPHERES.map((a) => {
          const isActive = selected === a.key;
          return (
            <Pressable
              key={a.key}
              onPress={() => setSelected(isActive ? null : a.key)}
              style={[styles.atmoBtn, isActive && styles.atmoBtnActive]}
            >
              <Text style={styles.atmoEmoji}>{a.emoji}</Text>
              <Text style={[styles.atmoTxt, isActive && styles.atmoTxtActive]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Palette d'origine */}
      <Text style={styles.blockLabel}>Original</Text>
      <View style={styles.bar}>
        {colors.map((c, i) => (
          <View key={i} style={{ flex: c.percent, backgroundColor: c.hex }} />
        ))}
      </View>

      {preview && (
        <>
          <Text style={styles.blockLabel}>
            {atmo.emoji} {atmo.label}
          </Text>
          <Text style={styles.atmoDesc}>{atmo.description}</Text>
          <View style={styles.bar}>
            {preview.map((p, i) => (
              <View key={i} style={{ flex: p.percent, backgroundColor: p.newHex }} />
            ))}
          </View>

          <View style={styles.grid}>
            {preview.map((p, i) => (
              <View key={i} style={[styles.swatch, { backgroundColor: p.newHex }]}>
                <Text style={[styles.swHex, { color: readableTextColor(p.newHex) }]}>
                  {p.newHex}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 12, color: '#777', marginTop: 4, marginBottom: 12 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  atmoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEE',
  },
  atmoBtnActive: { backgroundColor: '#333' },
  atmoEmoji: { fontSize: 15 },
  atmoTxt: { fontSize: 12, fontWeight: '600', color: '#444' },
  atmoTxtActive: { color: '#FFF' },
  blockLabel: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  atmoDesc: { fontSize: 12, color: '#777', marginBottom: 8 },
  bar: {
    flexDirection: 'row',
    height: 30,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  swatch: {
    width: 72,
    height: 48,
    borderRadius: 8,
    padding: 6,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#00000012',
  },
  swHex: { fontSize: 10, fontWeight: '700' },
});
