// components/AtmospherePanel.js
// Panneau des ambiances : boutons + prévisualisation de la palette transformée.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ATMOSPHERES, applyAtmosphere } from '../lib/atmospheres';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';

export default function AtmospherePanel({ colors = [] }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
                  {p.newHex.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: t.textPrimary },
    subtitle: { fontSize: 12.5, color: t.textSecondary, marginTop: 6, marginBottom: 14 },
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    atmoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    atmoBtnActive: { backgroundColor: t.accent, borderColor: t.accent },
    atmoEmoji: { fontSize: 15 },
    atmoTxt: { fontSize: 12, fontWeight: '700', color: t.textSecondary },
    atmoTxtActive: { color: t.accentOnText },
    blockLabel: { fontSize: 13, fontWeight: '800', color: t.textPrimary, marginTop: 14, marginBottom: 8 },
    atmoDesc: { fontSize: 12, color: t.textSecondary, marginBottom: 10, lineHeight: 17 },
    bar: {
      flexDirection: 'row',
      height: 32,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.border,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    swatch: {
      width: 80,
      height: 52,
      borderRadius: 10,
      padding: 7,
      justifyContent: 'flex-end',
      borderWidth: 1,
      borderColor: t.chipStroke,
    },
    swHex: { fontSize: 10, fontWeight: '700', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  });
}
