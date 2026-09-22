// components/AtmospherePanel.js
// Panneau des ambiances : boutons + prévisualisation de la palette transformée.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ATMOSPHERES, applyAtmosphere } from '../lib/atmospheres';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';
import EditingGuidance from './EditingGuidance';
import ImagePreview from './ImagePreview';

export default function AtmospherePanel({
  colors = [],
  selected: selectedProp = null,
  onSelect,
  imageUri = null,
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [internalSel, setInternalSel] = useState(null);

  const selected = onSelect ? selectedProp : internalSel;
  const setSelected = onSelect ? onSelect : setInternalSel;

  if (!colors.length) return null;

  const preview = selected ? applyAtmosphere(colors, selected) : null;
  const atmo = ATMOSPHERES.find((a) => a.key === selected);

  const previewMappings = preview
    ? preview.map((p) => ({
        rgb: p.original.rgb,
        hslOrigine: p.original.hsl,
        hslCible: p.newHsl,
        hexOrigine: p.original.hex,
        hexCible: p.newHex,
      }))
    : [];

  const guidanceTransforms = preview
    ? preview.map((p) => ({
        hexOrigine: p.original.hex,
        hexCible: p.newHex,
        hslOrigine: p.original.hsl,
        hslCible: p.newHsl,
        pourcentage: p.percent != null ? p.percent : p.original.percent,
      }))
    : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('sectionAmbiances')}</Text>
      <Text style={styles.subtitle}>{t('atmosphereSubtitle')}</Text>

      <View style={styles.btnRow}>
        {ATMOSPHERES.map((a) => {
          const isActive = selected === a.key;
          return (
            <Pressable
              key={a.key}
              onPress={() => setSelected(isActive ? null : a.key)}
              style={({ pressed }) => [
                styles.atmoBtn,
                isActive && styles.atmoBtnActive,
                pressed && styles.atmoBtnPressed,
              ]}
            >
              <Feather
                name={a.icon}
                size={15}
                color={isActive ? theme.accentOnText : theme.textSecondary}
              />
              <Text style={[styles.atmoTxt, isActive && styles.atmoTxtActive]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Palette d'origine */}
      <Text style={styles.blockLabel}>{t('originalLabel')}</Text>
      <View style={styles.bar}>
        {colors.map((c, i) => (
          <View key={i} style={{ flex: c.percent, backgroundColor: c.hex }} />
        ))}
      </View>

      {preview && (
        <>
          <View style={styles.blockLabelRow}>
            <Feather name={atmo.icon} size={14} color={theme.textSecondary} />
            <Text style={[styles.blockLabel, { marginTop: 0, marginBottom: 0 }]}>{atmo.label}</Text>
          </View>
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

          {imageUri && (
            <ImagePreview
              imageUri={imageUri}
              mappings={previewMappings}
              title={`${t('previewPhoto')} — ${atmo.label}`}
            />
          )}

          <EditingGuidance transforms={guidanceTransforms} context="atmosphere" />
        </>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: t.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
    atmoBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.96 }] }
        : { opacity: 0.7 }),
    },
    atmoTxt: { fontSize: 12, fontWeight: '700', color: t.textSecondary },
    atmoTxtActive: { color: t.accentOnText },
    blockLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: t.textPrimary,
      marginTop: 14,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    blockLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, marginBottom: 8 },
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
      borderColor: t.swatchBorder,
    },
    swHex: { fontSize: 10, fontWeight: '700', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
  });
}
