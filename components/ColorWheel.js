// components/ColorWheel.js
// Roue chromatique en SVG. Place les couleurs extraites selon HUE (angle) et
// saturation (rayon). Supporte plusieurs modèles : RGB, CMY, RYB.
// Responsive : se redimensionne selon la largeur du conteneur.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { hslToHex, readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';

/**
 * Convertit une teinte HSL "réelle" (0-360, modèle RGB additif) vers l'angle
 * affiché sur la roue selon le mode choisi.
 */
function hueToWheelAngle(hue, mode) {
  if (mode === 'RGB') return hue;
  if (mode === 'CMY') return (hue + 180) % 360; // roue soustractive opposée
  if (mode === 'RYB') return rgbHueToRyb(hue);
  return hue;
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

export default function ColorWheel({ colors = [], mode = 'RGB', onModeChange }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Mesure de la largeur disponible pour un rendu responsive.
  const [containerW, setContainerW] = useState(0);
  const size = Math.max(200, Math.min(320, (containerW || 300) - 4));

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * 0.62;
  const segments = 60;

  const wedges = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * 360;
    const a1 = ((i + 1) / segments) * 360;
    const displayHue = a0;
    const fill = hslToHex({ h: displayHue, s: 85, l: 52 });
    wedges.push(<Path key={i} d={wedgePath(cx, cy, rInner, rOuter, a0, a1)} fill={fill} />);
  }

  const maxPercent = Math.max(...colors.map((c) => c.percent), 1);

  return (
    <View style={styles.container} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => onModeChange && onModeChange(m)}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          >
            <Text style={[styles.modeTxt, mode === m && styles.modeTxtActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Svg width={size} height={size}>
        <G>{wedges}</G>
        <Circle cx={cx} cy={cy} r={rInner} fill={theme.surface} />
        {/* Axes discrets */}
        <Line x1={cx} y1={cy - rInner} x2={cx} y2={cy + rInner} stroke={theme.border} strokeWidth={1} />
        <Line x1={cx - rInner} y1={cy} x2={cx + rInner} y2={cy} stroke={theme.border} strokeWidth={1} />

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
              <Circle cx={px} cy={py} r={markerR} fill={c.hex} stroke={theme.surface} strokeWidth={2} />
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
      <Text style={styles.caption}>
        Angle = teinte · Distance au centre = saturation · Taille = importance
      </Text>
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
    modeTxt: { fontSize: 13, fontWeight: '700', color: t.textSecondary },
    modeTxtActive: { color: t.accentOnText },
    caption: { marginTop: 12, fontSize: 11, color: t.textMuted, textAlign: 'center' },
  });
}
