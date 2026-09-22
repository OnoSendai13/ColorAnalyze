// components/ColorPalette.js
// Affichage + ÉDITION de la palette de couleurs extraites (HEX + % + HSL).
// Édition : suppression, fusion (sélection multiple), rééchantillonnage, réinit.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

export default function ColorPalette({
  colors = [],
  title,
  editable = false,
  numColors = null,
  minColors = 5,
  maxColors = 10,
  canReset = false,
  onDeleteColor,
  onMergeColors,
  onResample,
  onReset,
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selection, setSelection] = useState([]);

  if (!colors.length) return null;

  const displayTitle = title ?? t('paletteExtracted');

  const toggleSelect = (i) => {
    setSelection((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const handleMerge = () => {
    if (selection.length >= 2 && onMergeColors) {
      onMergeColors(selection);
      setSelection([]);
    }
  };

  const handleDelete = (i) => {
    if (onDeleteColor) onDeleteColor(i);
    setSelection([]);
  };

  const handleResample = (delta) => {
    if (!onResample) return;
    const base = numColors || colors.length;
    const next = Math.max(minColors, Math.min(maxColors, base + delta));
    if (next !== base) onResample(next);
    setSelection([]);
  };

  const handleReset = () => {
    if (onReset) onReset();
    setSelection([]);
  };

  const current = numColors || colors.length;

  return (
    <View style={styles.wrap}>
      {displayTitle ? <Text style={styles.title}>{displayTitle}</Text> : null}

      {/* Barre proportionnelle */}
      <View style={styles.bar}>
        {colors.map((c, i) => (
          <View key={i} style={{ flex: c.percent, backgroundColor: c.hex }} />
        ))}
      </View>

      {/* Barre d'outils d'édition */}
      {editable && (
        <View style={styles.toolbar}>
          <View style={styles.resampleGroup}>
            <Text style={styles.toolLabel}>{t('colorsLabel')}</Text>
            <Pressable
              onPress={() => handleResample(-1)}
              disabled={current <= minColors}
              style={({ pressed }) => [
                styles.stepBtn,
                current <= minColors && styles.stepBtnDisabled,
                pressed && !styles.stepBtnDisabled && styles.stepBtnPressed,
              ]}
              accessibilityLabel={t('lessColorsA11y')}
            >
              <Feather name="minus" size={15} color={current <= minColors ? theme.textMuted : theme.textPrimary} />
            </Pressable>
            <Text style={styles.countTxt}>{current}</Text>
            <Pressable
              onPress={() => handleResample(1)}
              disabled={current >= maxColors}
              style={({ pressed }) => [
                styles.stepBtn,
                current >= maxColors && styles.stepBtnDisabled,
                pressed && !styles.stepBtnDisabled && styles.stepBtnPressed,
              ]}
              accessibilityLabel={t('moreColorsA11y')}
            >
              <Feather name="plus" size={15} color={current >= maxColors ? theme.textMuted : theme.textPrimary} />
            </Pressable>
          </View>

          {canReset && (
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}
              accessibilityLabel={t('resetPaletteA11y')}
            >
              <Feather name="rotate-ccw" size={13} color={theme.textSecondary} />
              <Text style={styles.resetTxt}>{t('resetPalette')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {editable && (
        <Text style={styles.hintTxt}>{t('paletteHint')}</Text>
      )}

      {/* Bouton de fusion */}
      {editable && selection.length >= 2 && (
        <Pressable
          onPress={handleMerge}
          style={({ pressed }) => [styles.mergeBtn, pressed && styles.mergeBtnPressed]}
        >
          <Feather name="git-merge" size={15} color={theme.accentOnText} />
          <Text style={styles.mergeTxt}>{t('mergeColors', { n: selection.length })}</Text>
        </Pressable>
      )}

      {/* Cartes détaillées */}
      <View style={styles.grid}>
        {colors.map((c, i) => {
          const txt = readableTextColor(c.hex);
          const isSelected = selection.includes(i);
          const canDelete = colors.length > 2;
          return (
            <View key={i} style={styles.swatchWrap}>
              <Pressable
                onPress={editable ? () => toggleSelect(i) : undefined}
                style={({ pressed }) => [
                  styles.swatch,
                  { backgroundColor: c.hex },
                  isSelected && styles.swatchSelected,
                  pressed && editable && styles.swatchPressed,
                ]}
              >
                {editable && (
                  <View style={styles.selMark}>
                    <Feather
                      name={isSelected ? 'check-circle' : 'circle'}
                      size={16}
                      color={txt}
                    />
                  </View>
                )}
                <Text style={[styles.hex, { color: txt }]}>{c.hex.toUpperCase()}</Text>
                <Text style={[styles.hsl, { color: txt }]}>
                  H{Math.round(c.hsl.h)} · S{Math.round(c.hsl.s)} · L{Math.round(c.hsl.l)}
                </Text>
              </Pressable>

              {/* Barre de pourcentage */}
              <View style={styles.pctTrack}>
                <View
                  style={[styles.pctFill, { width: `${Math.min(100, c.percent)}%`, backgroundColor: c.hex }]}
                />
              </View>
              <View style={styles.pctRow}>
                <Text style={styles.pctLabel}>{c.percent.toFixed(1)}%</Text>
                {editable && (
                  <Pressable
                    onPress={() => canDelete && handleDelete(i)}
                    disabled={!canDelete}
                    hitSlop={6}
                    accessibilityLabel={t('deleteColorA11y')}
                  >
                    <Feather
                      name="trash-2"
                      size={14}
                      color={canDelete ? theme.textSecondary : theme.textMuted}
                    />
                  </Pressable>
                )}
              </View>
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

    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 10,
    },
    resampleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toolLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textSecondary,
      marginRight: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
    },
    stepBtnDisabled: { opacity: 0.5 },
    stepBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ scale: 0.92 }] }
        : { opacity: 0.6 }),
    },
    countTxt: { fontSize: 14, fontWeight: '800', color: t.textPrimary, minWidth: 22, textAlign: 'center' },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
    },
    resetBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.97 }] }
        : { opacity: 0.7 }),
    },
    resetTxt: { fontSize: 12, fontWeight: '700', color: t.textSecondary },
    hintTxt: { fontSize: 11.5, color: t.textMuted, lineHeight: 16, marginBottom: 12 },

    mergeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 11,
      borderRadius: 11,
      backgroundColor: t.accent,
      marginBottom: 14,
    },
    mergeBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.98 }] }
        : { opacity: 0.8 }),
    },
    mergeTxt: { fontSize: 13, fontWeight: '800', color: t.accentOnText },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    swatchWrap: { width: 104 },
    swatch: {
      width: '100%',
      height: 84,
      borderRadius: 12,
      padding: 9,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: t.swatchBorder,
    },
    swatchSelected: {
      borderWidth: 3,
      borderColor: t.accent,
    },
    swatchPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ scale: 0.95 }] }
        : { opacity: 0.85 }),
    },
    selMark: { position: 'absolute', top: 6, right: 6 },
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
    pctRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    pctLabel: { fontSize: 11, fontWeight: '700', color: t.textSecondary },
  });
}

function Platform_monospace() {
  return 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
}
