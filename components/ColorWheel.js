// components/ColorWheel.js
// Roue chromatique en SVG. Place les couleurs extraites selon HUE (angle) et
// saturation (rayon). Supporte plusieurs modèles : RGB, CMY, RYB.
// FIX: L'anneau de fond s'adapte désormais au mode sélectionné.

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutAnimation, Platform } from 'react-native';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { hslToHex, readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

/**
 * Convertit une teinte HSL "réelle" (0-360, modèle RGB additif) vers l'angle
 * affiché sur la roue selon le mode choisi.
 */
function hueToWheelAngle(hue, mode) {
  if (mode === 'RGB') return hue;
  if (mode === 'CMY') return (hue + 180) % 360;
  if (mode === 'RYB') return rgbHueToRyb(hue);
  return hue;
}

/**
 * Fonction INVERSE : à partir d'un angle sur la roue, retrouve le hue RGB réel.
 * C'est cette fonction qui manquait et qui causait le bug de l'anneau identique.
 */
function wheelAngleToHue(angle, mode) {
  if (mode === 'RGB') return angle;
  if (mode === 'CMY') return (angle - 180 + 360) % 360;
  if (mode === 'RYB') return rybAngleToRgbHue(angle);
  return angle;
}

/** Table d'interpolation approximative RGB HUE -> RYB HUE (roue de l'artiste). */
function rgbHueToRyb(hue) {
  const map = [
    [0, 0], [60, 35], [120, 60], [180, 120], [240, 240], [300, 300], [360, 360],
  ];
  for (let i = 0; i < map.length - 1; i++) {
    const [h0, r0] = map[i];
    const [h1, r1] = map[i + 1];
    if (hue >= h0 && hue <= h1) {
      const t = (hue - h0) / (h1 - h0);
      return r0 + t * (r1 - r0);
    }
  }
  return hue;
}

/** Table INVERSE : RYB angle -> RGB hue. */
function rybAngleToRgbHue(rybAngle) {
  const map = [
    [0, 0], [35, 60], [60, 120], [120, 180], [240, 240], [300, 300], [360, 360],
  ];
  for (let i = 0; i < map.length - 1; i++) {
    const [r0, h0] = map[i];
    const [r1, h1] = map[i + 1];
    if (rybAngle >= r0 && rybAngle <= r1) {
      const t = (rybAngle - r0) / (r1 - r0);
      return h0 + t * (h1 - h0);
    }
  }
  return rybAngle;
}

/** Génère le chemin SVG d'un secteur (wedge). */
function wedgePath(cx, cy, rInner, rOuter, a0, a1) {
  const rad = (a) => ((a - 90) * Math.PI) / 180;
  const x0o = cx + rOuter * Math.cos(rad(a0));
  const y0o = cy + rOuter * Math.sin(rad(a0));
  const x1o = cx + rOuter * Math.cos(rad(a1));
  const y1o = cy + rOuter * Math.sin(rad(a1));
  const x1i = cx + rInner * Math.cos(rad(a1));
  const y1i = cy + rInner * Math.sin(rad(a1));
  const x0i = cx + rInner * Math.cos(rad(a0));
  const y0i = cy + rInner * Math.sin(rad(a0));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

const MODES = ['RGB', 'CMY', 'RYB'];

/** Primaries labels for each mode, with their angle on the wheel. */
const PRIMARIES = {
  RGB: [
    { label: 'R', angle: 0 },
    { label: 'G', angle: 120 },
    { label: 'B', angle: 240 },
  ],
  CMY: [
    { label: 'C', angle: 0 },
    { label: 'M', angle: 120 },
    { label: 'Y', angle: 240 },
  ],
  RYB: [
    { label: 'R', angle: 0 },
    { label: 'Y', angle: 120 },
    { label: 'B', angle: 240 },
  ],
};

export default function ColorWheel({ colors = [], mode = 'RGB', onModeChange }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [showExplain, setShowExplain] = useState(false);
  const [containerW, setContainerW] = useState(0);
  const size = Math.max(200, Math.min(320, (containerW || 300) - 4));

  // Chevron rotation animation
  const chevronRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: showExplain ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showExplain]);
  const chevronSpin = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggleExplain = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    setShowExplain((v) => !v);
  };

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * 0.62;
  const segments = 72;

  // FIX: L'anneau utilise maintenant wheelAngleToHue pour adapter les couleurs au mode
  const wedges = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * 360;
    const a1 = ((i + 1) / segments) * 360;
    const midAngle = (a0 + a1) / 2;
    // Conversion inverse : quel hue RGB correspond à cet angle sur la roue du mode courant ?
    const rgbHue = wheelAngleToHue(midAngle, mode);
    const fill = hslToHex({ h: rgbHue, s: 85, l: 52 });
    wedges.push(<Path key={i} d={wedgePath(cx, cy, rInner, rOuter, a0, a1)} fill={fill} />);
  }

  const maxPercent = Math.max(...colors.map((c) => c.percent), 1);

  // Primary labels
  const primaries = PRIMARIES[mode] || PRIMARIES.RGB;

  return (
    <View style={styles.container} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      {/* Mode buttons with underline indicator */}
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => onModeChange && onModeChange(m)}
            style={({ pressed }) => [
              styles.modeBtn,
              mode === m && styles.modeBtnActive,
              pressed && styles.modeBtnPressed,
            ]}
          >
            <Text style={[styles.modeTxt, mode === m && styles.modeTxtActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Svg width={size} height={size}>
        <G>{wedges}</G>
        <Circle cx={cx} cy={cy} r={rInner} fill={theme.surface} />
        {/* Axes */}
        <Line x1={cx} y1={cy - rInner} x2={cx} y2={cy + rInner} stroke={theme.border} strokeWidth={1} />
        <Line x1={cx - rInner} y1={cy} x2={cx + rInner} y2={cy} stroke={theme.border} strokeWidth={1} />

        {/* Primary labels on the outer ring */}
        {primaries.map((p, idx) => {
          const rad = ((p.angle - 90) * Math.PI) / 180;
          const labelR = rOuter + 14;
          const lx = cx + labelR * Math.cos(rad);
          const ly = cy + labelR * Math.sin(rad);
          return (
            <SvgText
              key={idx}
              x={lx}
              y={ly + 4}
              fontSize={11}
              fontWeight="bold"
              fill={theme.textSecondary}
              textAnchor="middle"
              opacity={0.8}
            >
              {p.label}
            </SvgText>
          );
        })}

        {/* Color markers */}
        {colors.map((c, idx) => {
          const angle = hueToWheelAngle(c.hsl.h, mode);
          const rad = ((angle - 90) * Math.PI) / 180;
          const sat = Math.min(1, c.hsl.s / 100);
          const r = rInner + (rOuter - rInner) * sat;
          const px = cx + r * Math.cos(rad);
          const py = cy + r * Math.sin(rad);
          const markerR = 7 + (c.percent / maxPercent) * 10;
          return (
            <G key={idx}>
              <Line x1={cx} y1={cy} x2={px} y2={py} stroke={theme.borderStrong} strokeWidth={1} />
              <Circle cx={px} cy={py} r={markerR} fill={c.hex} stroke={theme.swatchBorder} strokeWidth={2} />
              <SvgText
                x={px}
                y={py + 3}
                fontSize={8}
                fontWeight="bold"
                fill={readableTextColor(c.hex)}
                textAnchor="middle"
              >
                {Math.round(c.percent)}%
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <Text style={styles.caption}>{t('wheelCaption')}</Text>

      {/* Explanation section with animated chevron */}
      <Pressable
        onPress={toggleExplain}
        style={({ pressed }) => [styles.explainHeader, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Feather name="help-circle" size={15} color={theme.accentSecondary} />
        <Text style={styles.explainHeaderTxt}>{t('wheelExplainTitle')}</Text>
        <Animated.View style={{ transform: [{ rotate: chevronSpin }] }}>
          <Feather name="chevron-down" size={16} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>

      {showExplain && (
        <View style={styles.explainBody}>
          <Text style={styles.explainP}>{t('wheelExplainIntro')}</Text>
          <View style={styles.explainItem}>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            <Text style={styles.explainP}>
              <Text style={styles.explainBold}>RGB</Text> — {t('wheelRgbDesc')}
            </Text>
          </View>
          <View style={styles.explainItem}>
            <View style={[styles.dot, { backgroundColor: theme.accentSecondary }]} />
            <Text style={styles.explainP}>
              <Text style={styles.explainBold}>CMY</Text> — {t('wheelCmyDesc')}
            </Text>
          </View>
          <View style={styles.explainItem}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <Text style={styles.explainP}>
              <Text style={styles.explainBold}>RYB</Text> — {t('wheelRybDesc')}
            </Text>
          </View>
          <Text style={styles.explainP}>{t('wheelExplainConclusion')}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { alignItems: 'center', width: '100%' },
    modeRow: { flexDirection: 'row', marginBottom: 14, gap: 8 },
    modeBtn: {
      paddingHorizontal: 18,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
    },
    modeBtnActive: { backgroundColor: t.accent, borderColor: t.accent },
    modeBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.96 }] }
        : { opacity: 0.7 }),
    },
    modeTxt: { fontSize: 13, fontWeight: '700', color: t.textSecondary },
    modeTxtActive: { color: t.accentOnText },
    caption: { marginTop: 12, fontSize: 11, color: t.textMuted, textAlign: 'center' },

    explainHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'stretch',
      marginTop: 16,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
    },
    explainHeaderTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: t.textPrimary },
    explainBody: {
      alignSelf: 'stretch',
      marginTop: 10,
      padding: 14,
      borderRadius: 11,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
      gap: 10,
    },
    explainItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
    dot: { width: 9, height: 9, borderRadius: 3, marginTop: 5 },
    explainP: { flex: 1, fontSize: 12.5, color: t.textSecondary, lineHeight: 18 },
    explainBold: { color: t.textPrimary, fontWeight: '800' },
  });
}
