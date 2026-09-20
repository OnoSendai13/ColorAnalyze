// components/ColorPalette.js
// Affichage de la palette de couleurs extraites (HEX + pourcentage + HSL).

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';

export default function ColorPalette({ colors = [], title = 'Palette extraite' }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
            <View key={i} style={styles.swatchWrap}>
              <View style={[styles.swatch, { backgroundColor: c.hex }]}>
                <Text style={[styles.hex, { color: txt }]}>{c.hex.toUpperCase()}</Text>
                <Text style={[styles.hsl, { color: txt }]}>
                  H{Math.round(c.hsl.h)} · S{Math.round(c.hsl.s)} · L{Math.round(c.hsl.l)}
                </Text>
              </View>
              {/* Barre de pourcentage fine sous chaque couleur */}
              <View style={styles.pctTrack}>
                <View
                  style={[styles.pctFill, { width: `${Math.min(100, c.percent)}%`, backgroundColor: c.hex }]}
                />
              </View>
              <Text style={styles.pctLabel}>{c.percent.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    title: { fontSize: 16, fontWeight: '800', marginBottom: 12, color: t.textPrimary },
    bar: {
      flexDirection: 'row',
      height: 30,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: t.border,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatchWrap: { width: 104 },
    swatch: {
      width: '100%',
      height: 84,
      borderRadius: 12,
      padding: 9,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.chipStroke,
    },
    hex: {
      fontSize: 12.5,
      fontWeight: '700',
      fontFamily: Platform_monospace(),
    },
    hsl: { fontSize: 10, opacity: 0.92, fontFamily: Platform_monospace() },
    pctTrack: {
      height: 4,
      borderRadius: 3,
      backgroundColor: t.surfaceMuted,
      overflow: 'hidden',
      marginTop: 7,
    },
    pctFill: { height: 4, borderRadius: 3 },
    pctLabel: { fontSize: 11, fontWeight: '700', color: t.textSecondary, marginTop: 4 },
  });
}

// Police monospace cross-platform (web / iOS / Android).
function Platform_monospace() {
  return 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
}
