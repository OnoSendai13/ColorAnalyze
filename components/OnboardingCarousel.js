// components/OnboardingCarousel.js
// Carrousel de visite guidée au premier lancement.
// 5 écrans : Bienvenue, Import, Palette & Roue, Harmonies, Confidentialité.
// Conforme aux guidelines Google Play / Apple : valeur ajoutée immédiate,
// pas de mur de texte, CTA clair.

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, Rect, G, Line, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDE_W = Math.min(SCREEN_W, 760);

// ---------------------------------------------------------------------------
// Inline SVG illustrations (pas de dépendance image)
// ---------------------------------------------------------------------------

function IllustrationWelcome({ size = 160, theme }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 160 160">
      {/* Color wheel simplified */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((h) => {
        const rad = ((h - 90) * Math.PI) / 180;
        const cx = 80 + 50 * Math.cos(rad);
        const cy = 80 + 50 * Math.sin(rad);
        return (
          <Circle
            key={h}
            cx={cx}
            cy={cy}
            r={12}
            fill={`hsl(${h}, 75%, 55%)`}
            opacity={0.9}
          />
        );
      })}
      <Circle cx={80} cy={80} r={22} fill={theme.surface} />
      <SvgText x={80} y={85} fontSize={16} fontWeight="bold" fill={theme.accent} textAnchor="middle">
        CA
      </SvgText>
    </Svg>
  );
}

function IllustrationImport({ size = 160, theme }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* Photo frame */}
      <Rect x={30} y={25} width={100} height={75} rx={12} fill={theme.surfaceElevated} stroke={theme.border} strokeWidth={1.5} />
      {/* Mountain scene */}
      <Path d="M30 100 L55 60 L80 85 L100 55 L130 100 Z" fill={theme.accentSoft} />
      <Circle cx={110} cy={42} r={10} fill={theme.warning} opacity={0.7} />
      {/* Upload arrow */}
      <Circle cx={80} cy={125} r={22} fill={theme.accent} />
      <Path d="M80 115 L80 135 M73 122 L80 115 L87 122" stroke={theme.accentOnText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function IllustrationPalette({ size = 160, theme }) {
  const colors = ['#FF6B6B', '#E0A100', '#37E0C6', '#7C5CFF', '#5A9FFF'];
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* Palette bar */}
      {colors.map((c, i) => (
        <Rect key={i} x={20 + i * 24} y={30} width={24} height={60} rx={i === 0 ? 8 : i === 4 ? 8 : 0} fill={c} />
      ))}
      {/* Wheel mini */}
      {[0, 60, 120, 180, 240, 300].map((h) => {
        const rad = ((h - 90) * Math.PI) / 180;
        return (
          <Circle key={h} cx={80 + 28 * Math.cos(rad)} cy={125 + 28 * Math.sin(rad)} r={8} fill={`hsl(${h}, 70%, 55%)`} />
        );
      })}
      <Circle cx={80} cy={125} r={12} fill={theme.surface} stroke={theme.border} strokeWidth={1} />
    </Svg>
  );
}

function IllustrationHarmony({ size = 160, theme }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* Complementary pair */}
      <Circle cx={55} cy={60} r={28} fill="#FF6B6B" opacity={0.85} />
      <Circle cx={105} cy={60} r={28} fill="#37E0C6" opacity={0.85} />
      {/* Arrow */}
      <Path d="M55 95 L105 95" stroke={theme.textMuted} strokeWidth={1.5} strokeDasharray="4,4" />
      <Path d="M100 90 L107 95 L100 100" stroke={theme.textMuted} strokeWidth={1.5} fill="none" />
      {/* Atmosphere chips */}
      {['#FF9F43', '#54A0FF', '#5F27CD', '#10AC84'].map((c, i) => (
        <Rect key={i} x={22 + i * 30} y={115} width={26} height={26} rx={7} fill={c} opacity={0.75} />
      ))}
    </Svg>
  );
}

function IllustrationPrivacy({ size = 160, theme }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      {/* Shield */}
      <Path
        d="M80 20 L120 40 L120 85 C120 115 80 140 80 140 C80 140 40 115 40 85 L40 40 Z"
        fill={theme.accentSoft}
        stroke={theme.accent}
        strokeWidth={2}
      />
      {/* Check */}
      <Path d="M62 80 L75 93 L100 62" stroke={theme.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const ILLUSTRATIONS = [
  IllustrationWelcome,
  IllustrationImport,
  IllustrationPalette,
  IllustrationHarmony,
  IllustrationPrivacy,
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OnboardingCarousel({ onComplete }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides = useMemo(() => [
    {
      key: 'welcome',
      titleKey: 'onb_welcomeTitle',
      descKey: 'onb_welcomeDesc',
    },
    {
      key: 'import',
      titleKey: 'onb_importTitle',
      descKey: 'onb_importDesc',
    },
    {
      key: 'palette',
      titleKey: 'onb_paletteTitle',
      descKey: 'onb_paletteDesc',
    },
    {
      key: 'harmony',
      titleKey: 'onb_harmonyTitle',
      descKey: 'onb_harmonyDesc',
    },
    {
      key: 'privacy',
      titleKey: 'onb_privacyTitle',
      descKey: 'onb_privacyDesc',
    },
  ], []);

  const total = slides.length;
  const isLast = currentIndex === total - 1;

  const goTo = (index) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: SLIDE_W * index, animated: true });
    }
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (isLast) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        onComplete?.();
      });
    } else {
      goTo(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onComplete?.();
    });
  };

  const handleScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SLIDE_W);
    if (idx !== currentIndex && idx >= 0 && idx < total) {
      setCurrentIndex(idx);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.skipTxt}>{t('onb_skip')}</Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((slide, i) => {
          const Illustration = ILLUSTRATIONS[i];
          return (
            <View key={slide.key} style={[styles.slide, { width: SLIDE_W }]}>
              <View style={styles.illustrationWrap}>
                <Illustration size={160} theme={theme} />
              </View>
              <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
              <Text style={styles.slideDesc}>{t(slide.descKey)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === currentIndex && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomRow}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
        >
          <Text style={styles.ctaTxt}>
            {isLast ? t('onb_start') : t('onb_next')}
          </Text>
          {!isLast && (
            <Feather name="arrow-right" size={18} color={theme.accentOnText} />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipBtn: {
      position: 'absolute',
      top: Platform.OS === 'web' ? 20 : 54,
      right: 20,
      zIndex: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    skipTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: t.textMuted,
    },
    scrollView: {
      flex: 1,
      maxWidth: SLIDE_W,
    },
    scrollContent: {},
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
      paddingBottom: 20,
    },
    illustrationWrap: {
      marginBottom: 32,
      width: 180,
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 90,
      backgroundColor: t.surfaceMuted,
    },
    slideTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: t.textPrimary,
      textAlign: 'center',
      letterSpacing: -0.5,
      marginBottom: 14,
    },
    slideDesc: {
      fontSize: 15,
      color: t.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 340,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 28,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.border,
    },
    dotActive: {
      backgroundColor: t.accent,
      width: 24,
    },
    bottomRow: {
      paddingHorizontal: 32,
      paddingBottom: Platform.OS === 'web' ? 32 : 48,
      width: '100%',
      maxWidth: SLIDE_W,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 16,
    },
    ctaBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.98 }] }
        : { opacity: 0.85 }),
    },
    ctaTxt: {
      fontSize: 16,
      fontWeight: '800',
      color: t.accentOnText,
    },
  });
}
