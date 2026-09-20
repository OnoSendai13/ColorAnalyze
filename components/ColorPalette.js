// components/ColorPalette.js
// Affichage de la palette de couleurs extraites (HEX + pourcentage).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { readableTextColor } from '../lib/colorConversions';

export default function ColorPalette({ colors = [], title = 'Palette extraite' }) {
  if (!colors.length) return null;
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      {/* Barre proportionnelle */}
      <View style={styles.bar}>
        {colors.map((c, i) => (
          <View key={i} style={{ flex: c.percent, backgroundColor: c.hex }} />
        ))}
      </View>

      {/* Cartes détaillées */}
      <View style={styles.grid}>
        {colors.map((c, i) => {
          const txt = readableTextColor(c.hex);
          return (
            <View key={i} style={[styles.swatch, { backgroundColor: c.hex }]}>
              <Text style={[styles.hex, { color: txt }]}>{c.hex}</Text>
              <Text style={[styles.pct, { color: txt }]}>{c.percent.toFixed(1)}%</Text>
              <Text style={[styles.hsl, { color: txt }]}>
                H{Math.round(c.hsl.h)} S{Math.round(c.hsl.s)} L{Math.round(c.hsl.l)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#222' },
  bar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 96,
    height: 84,
    borderRadius: 10,
    padding: 8,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#00000012',
  },
  hex: { fontSize: 13, fontWeight: '700' },
  pct: { fontSize: 12, fontWeight: '600' },
  hsl: { fontSize: 10, opacity: 0.9 },
});
