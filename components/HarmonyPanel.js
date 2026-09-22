// components/HarmonyPanel.js
// Panneau des harmonies : schéma détecté + boutons alternatifs + visualisation
// des décalages HUE, score de disruption et prévisualisation photo re-teintée.

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated, LayoutAnimation, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SCHEMES, computeSchemeTransform } from '../lib/colorHarmony';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';
import EditingGuidance from './EditingGuidance';
import ImagePreview from './ImagePreview';

function AnimatedDisruptionBar({ value, theme, styles }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    width.setValue(0);
    Animated.timing(width, {
      toValue: Math.min(100, value),
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [value]);

  let color = theme.success;
  if (value >= 35) color = theme.danger;
  else if (value >= 12) color = theme.warning;

  const animWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.disWrap}>
      <View style={styles.disTrack}>
        <Animated.View style={[styles.disFill, { width: animWidth, backgroundColor: color }]} />
      </View>
      <Text style={[styles.disValue, { color }]}>{Math.round(value)}%</Text>
    </View>
  );
}

export default function HarmonyPanel({
  colors = [],
  detected,
  selected = null,
  onSelect,
  imageUri = null,
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [internalSel, setInternalSel] = useState(null);
  const [showCalc, setShowCalc] = useState(false);

  // Animated chevron
  const chevronRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: showCalc ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showCalc]);
  const chevronSpin = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggleCalc = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    setShowCalc((v) => !v);
  };

  const sel = onSelect ? selected : internalSel;
  const setSel = onSelect ? onSelect : setInternalSel;

  if (!colors.length || !detected) return null;

  const transform = sel ? computeSchemeTransform(colors, sel) : null;

  const guidanceTransforms = transform
    ? transform.mappings.map((m) => ({
        hexOrigine: m.original.hex,
        hexCible: m.newHex,
        hslOrigine: m.original.hsl,
        hslCible: m.newHsl,
        pourcentage: m.original.percent,
      }))
    : [];

  const previewMappings = transform
    ? transform.mappings.map((m) => ({
        rgb: m.original.rgb,
        hslOrigine: m.original.hsl,
        hslCible: m.newHsl,
        hexOrigine: m.original.hex,
        hexCible: m.newHex,
      }))
    : [];

  let contributions = [];
  let totalWeighted = 0;
  let totalPercent = 0;
  if (transform) {
    transform.mappings.forEach((m) => {
      const shift = m.isNeutral ? 0 : Math.abs(m.shift);
      const pct = m.original.percent || 0;
      totalWeighted += shift * pct;
      totalPercent += pct;
      contributions.push({ hex: m.original.hex, pct, shift, isNeutral: m.isNeutral });
    });
  }
  const avgShift = totalPercent > 0 ? totalWeighted / totalPercent : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.detectedCard}>
        <Text style={styles.detectedLabel}>{t('detectedScheme')}</Text>
        <Text style={styles.detectedName}>{detected.label}</Text>
        <Text style={styles.detectedDetail}>{detected.details}</Text>
        <Text style={styles.confidence}>
          {t('confidence')} : {Math.round(detected.score * 100)}% · {t('hueFamilies')} : {detected.hueGroups.length}
          {detected.neutralRatio > 0.15
            ? ` · ${t('neutrals')} : ${Math.round(detected.neutralRatio * 100)}%`
            : ''}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{t('exploreSchemes')}</Text>
      <View style={styles.btnRow}>
        {Object.entries(SCHEMES).map(([key, def]) => {
          const isActive = sel === key;
          const isDetected = detected.key === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSel(isActive ? null : key)}
              style={({ pressed }) => [
                styles.schemeBtn,
                isActive && styles.schemeBtnActive,
                isDetected && styles.schemeBtnDetected,
                pressed && styles.schemeBtnPressed,
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
          <Text style={styles.transformTitle}>{t('transformTo', { name: transform.label })}</Text>

          <Text style={styles.disLabel}>{t('disruptionScore')}</Text>
          <AnimatedDisruptionBar value={transform.disruption} theme={theme} styles={styles} />
          <Text style={styles.advice}>{transform.advice}</Text>

          {/* Explanation section */}
          <Pressable style={({ pressed }) => [styles.calcHeader, pressed && { opacity: 0.7 }]} onPress={toggleCalc}>
            <Feather name="help-circle" size={15} color={theme.accent} />
            <Text style={styles.calcHeaderTxt}>{t('calcTitle')}</Text>
            <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
              <Feather name="chevron-down" size={16} color={theme.textSecondary} />
            </Animated.View>
          </Pressable>

          {showCalc && (
            <View style={styles.calcBody}>
              <Text style={styles.calcP}>
                {t('calcExplain')}
              </Text>

              <View style={styles.formulaBox}>
                <Text style={styles.formulaTxt}>{t('formulaAvg')}</Text>
                <Text style={styles.formulaTxt}>{t('formulaScore')}</Text>
              </View>

              <Text style={styles.calcSub}>{t('contributionTitle')}</Text>
              {contributions.map((c, i) => (
                <View key={i} style={styles.contribRow}>
                  <View style={[styles.contribSwatch, { backgroundColor: c.hex }]} />
                  <Text style={styles.contribTxt}>
                    {c.isNeutral ? (
                      <Text style={styles.contribMuted}>{t('neutralIgnored')}</Text>
                    ) : (
                      <>
                        {Math.round(c.shift)}° × {Math.round(c.pct)}% ={' '}
                        <Text style={styles.calcBold}>{Math.round(c.shift * c.pct)}</Text>
                      </>
                    )}
                  </Text>
                </View>
              ))}

              <Text style={styles.calcTotal}>
                {t('avgWeightedShift')} : {Math.round(avgShift)}° → score {Math.round(transform.disruption)}%
              </Text>

              <View style={styles.calcScale}>
                <Text style={styles.calcScaleItem}>
                  <Text style={{ color: theme.success }}>■</Text> &lt; 12 % : {t('scaleSmooth')}
                </Text>
                <Text style={styles.calcScaleItem}>
                  <Text style={{ color: theme.warning }}>■</Text> 12–35 % : {t('scaleModerate')}
                </Text>
                <Text style={styles.calcScaleItem}>
                  <Text style={{ color: theme.danger }}>■</Text> ≥ 35 % : {t('scaleMajor')}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.mapTitle}>{t('hueShiftsPerColor')}</Text>
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
                    ? t('neutralLabel')
                    : `${m.shift > 0 ? '+' : ''}${Math.round(m.shift)}°`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {transform && imageUri && (
        <ImagePreview
          imageUri={imageUri}
          mappings={previewMappings}
          title={`${t('previewPhoto')} — ${transform.label}`}
        />
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
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: t.textPrimary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
    schemeBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.96 }] }
        : { opacity: 0.7 }),
    },
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
    disLabel: {
      fontSize: 12,
      color: t.textSecondary,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    disWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    disTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: t.surfaceMuted, overflow: 'hidden' },
    disFill: { height: 12, borderRadius: 6 },
    disValue: { fontSize: 13, fontWeight: '800', width: 44, textAlign: 'right' },
    advice: { fontSize: 12, color: t.textSecondary, marginTop: 10, lineHeight: 17 },

    calcHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: t.surfaceMuted,
    },
    calcHeaderTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: t.textPrimary },
    calcBody: {
      marginTop: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor: t.surfaceElevated,
      borderWidth: 1,
      borderColor: t.border,
    },
    calcP: { fontSize: 12.5, color: t.textSecondary, lineHeight: 19 },
    calcBold: { fontWeight: '800', color: t.textPrimary },
    formulaBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: t.surfaceMuted,
      gap: 6,
    },
    formulaTxt: {
      fontSize: 12,
      color: t.textPrimary,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    },
    calcSub: { fontSize: 12.5, fontWeight: '800', color: t.textPrimary, marginTop: 14, marginBottom: 8 },
    contribRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    contribSwatch: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: t.swatchBorder,
    },
    contribTxt: { fontSize: 12.5, color: t.textSecondary },
    contribMuted: { fontStyle: 'italic', color: t.textMuted },
    calcTotal: {
      fontSize: 12.5,
      fontWeight: '800',
      color: t.textPrimary,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    calcScale: { marginTop: 12, gap: 4 },
    calcScaleItem: { fontSize: 11.5, color: t.textSecondary },

    mapTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: t.textPrimary,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
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
