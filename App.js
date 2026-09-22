// App.js — ColorAnalyze
// Application Expo (iOS + Android + Web) d'analyse de couleurs, 100% côté client.
// Design "Studio créatif sombre" : thème clair + sombre via lib/theme.js.

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
// react-native-svg used by child components; MarchingBorder uses raw HTML svg

import { getPixelData } from './lib/imagePixels';
import { extractDominantColors } from './lib/colorAnalysis';
import { detectScheme } from './lib/colorHarmony';
import { deleteColorAt, mergeColorsAt, renormalize } from './lib/paletteEdit';
import { buildReport, buildCsv, buildJson, buildCss, buildSass } from './lib/report';
import { ThemeProvider, useTheme, ThemeToggle } from './lib/theme';
import { LanguageProvider, useLang } from './lib/i18n';

import { isOnboardingDone, markOnboardingDone } from './lib/onboarding';

import ColorPalette from './components/ColorPalette';
import ColorWheel from './components/ColorWheel';
import HarmonyPanel from './components/HarmonyPanel';
import AtmospherePanel from './components/AtmospherePanel';
import LanguageMenu from './components/LanguageMenu';
import OnboardingCarousel from './components/OnboardingCarousel';
import LegalScreen from './components/LegalScreen';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TABS = [
  { key: 'palette', labelKey: 'tabPalette', icon: 'aperture' },
  { key: 'harmony', labelKey: 'tabHarmony', icon: 'compass' },
  { key: 'atmosphere', labelKey: 'tabAtmosphere', icon: 'sliders' },
];

// ---------------------------------------------------------------------------
// Animated marching-ants dropzone border (CSS keyframes, web only)
// ---------------------------------------------------------------------------
function MarchingBorder({ active, theme }) {
  if (Platform.OS !== 'web') return null;

  const color = active ? theme.accent : theme.textMuted;
  const speed = active ? '0.6s' : '2s';
  const opacity = active ? 1 : 0.45;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marchingAnts {
          to { stroke-dashoffset: -28; }
        }
        .marching-border rect {
          animation: marchingAnts ${speed} linear infinite;
        }
      ` }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, overflow: 'hidden', pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute' }} className="marching-border">
          <rect
            x="1.5" y="1.5"
            width="calc(100% - 3px)" height="calc(100% - 3px)"
            rx="15" ry="15"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="14,14"
            strokeOpacity={opacity}
          />
        </svg>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Animated color dot for brand
// ---------------------------------------------------------------------------
function BrandDot({ theme }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        width: 16,
        height: 16,
        borderRadius: 5,
        transform: [{ rotate: spin }],
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: '#FF6B6B' }} />
        <View style={{ flex: 1, backgroundColor: '#7C5CFF' }} />
      </View>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: '#37E0C6' }} />
        <View style={{ flex: 1, backgroundColor: '#E0A100' }} />
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Staggered fade-in wrapper
// ---------------------------------------------------------------------------
function FadeInView({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Animated pill for tab indicator
// ---------------------------------------------------------------------------
function TabBar({ tabs, activeKey, onSelect, theme, t }) {
  const styles = useMemo(() => makeTabStyles(theme), [theme]);
  const [tabLayouts, setTabLayouts] = useState({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const layout = tabLayouts[activeKey];
    if (layout) {
      Animated.parallel([
        Animated.spring(pillX, { toValue: layout.x, tension: 120, friction: 15, useNativeDriver: false }),
        Animated.spring(pillW, { toValue: layout.width, tension: 120, friction: 15, useNativeDriver: false }),
      ]).start();
    }
  }, [activeKey, tabLayouts]);

  const handleLayout = (key, e) => {
    const { x, width } = e.nativeEvent.layout;
    setTabLayouts((prev) => ({ ...prev, [key]: { x, width } }));
  };

  return (
    <View style={styles.tabRow}>
      {/* Animated pill background */}
      <Animated.View
        style={[
          styles.tabPill,
          { left: pillX, width: pillW },
        ]}
      />
      {tabs.map((tabItem) => {
        const active = activeKey === tabItem.key;
        return (
          <Pressable
            key={tabItem.key}
            onPress={() => onSelect(tabItem.key)}
            onLayout={(e) => handleLayout(tabItem.key, e)}
            style={styles.tab}
          >
            <Feather
              name={tabItem.icon}
              size={15}
              color={active ? theme.accentOnText : theme.textSecondary}
            />
            <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>
              {t(tabItem.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated disruption / palette bars
// ---------------------------------------------------------------------------
function AnimatedBar({ percent, color, style, delay = 0 }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(width, {
        toValue: percent,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [percent]);

  const animWidth = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[style, { width: animWidth, backgroundColor: color }]} />
  );
}

// ---------------------------------------------------------------------------
// Main app content
// ---------------------------------------------------------------------------
function AppContent() {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // --- Onboarding & Legal screen state ---
  const [showOnboarding, setShowOnboarding] = useState(null); // null = loading, true/false
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => {
    isOnboardingDone().then((done) => setShowOnboarding(!done));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    markOnboardingDone();
    setShowOnboarding(false);
  }, []);

  // Show nothing while checking onboarding state
  if (showOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  // Show onboarding carousel
  if (showOnboarding) {
    return <OnboardingCarousel onComplete={handleOnboardingComplete} />;
  }

  // Show legal screen
  if (showLegal) {
    return <LegalScreen onClose={() => setShowLegal(false)} />;
  }

  return <MainScreen onShowLegal={() => setShowLegal(true)} />;
}

function MainScreen({ onShowLegal }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [imageUri, setImageUri] = useState(null);
  const [colors, setColors] = useState([]);
  const [originalColors, setOriginalColors] = useState([]);
  const [pixelData, setPixelData] = useState(null);
  const [numColors, setNumColors] = useState(null);
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('palette');
  const [wheelMode, setWheelMode] = useState('RGB');
  const [dragOver, setDragOver] = useState(false);
  const [dropzoneLayout, setDropzoneLayout] = useState({ w: 0, h: 0 });

  const [harmonySelected, setHarmonySelected] = useState(null);
  const [atmoSelected, setAtmoSelected] = useState(null);
  const [copied, setCopied] = useState(null);

  const fileInputRef = useRef(null);

  // Tab change with LayoutAnimation
  const handleTabChange = useCallback((key) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setTab(key);
  }, []);

  const analyze = useCallback(async (uri) => {
    setLoading(true);
    setError(null);
    try {
      const pd = await getPixelData(uri);
      const extracted = extractDominantColors(pd.data, { minColors: 5, maxColors: 10 });
      if (!extracted.length) {
        throw new Error(t('errNoColors'));
      }
      setPixelData(pd);
      setOriginalColors(extracted);
      setColors(extracted);
      setNumColors(extracted.length);
      setDetected(detectScheme(extracted));
      setHarmonySelected(null);
      setAtmoSelected(null);
      setTab('palette');
    } catch (e) {
      console.warn(e);
      setError(e.message || t('errAnalysis'));
      setColors([]);
      setOriginalColors([]);
      setPixelData(null);
      setDetected(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const commitPalette = useCallback((next) => {
    setColors(next);
    setDetected(detectScheme(next));
    setNumColors(next.length);
  }, []);

  const handleDeleteColor = useCallback(
    (i) => commitPalette(deleteColorAt(colors, i)),
    [colors, commitPalette]
  );

  const handleMergeColors = useCallback(
    (indices) => commitPalette(mergeColorsAt(colors, indices)),
    [colors, commitPalette]
  );

  const handleResample = useCallback(
    (k) => {
      if (!pixelData) return;
      const extracted = extractDominantColors(pixelData.data, { forceK: k });
      const next = renormalize(extracted);
      setColors(next);
      setDetected(detectScheme(next));
      setNumColors(k);
    },
    [pixelData]
  );

  const handleReset = useCallback(() => {
    if (!originalColors.length) return;
    setColors(originalColors);
    setDetected(detectScheme(originalColors));
    setNumColors(originalColors.length);
  }, [originalColors]);

  const isEdited = useMemo(() => {
    if (!originalColors.length) return false;
    if (colors.length !== originalColors.length) return true;
    return colors.some((c, i) => !originalColors[i] || c.hex !== originalColors[i].hex);
  }, [colors, originalColors]);

  // --- Export handlers ---
  const handleCopyReport = useCallback(async () => {
    try {
      const txt = buildReport({ colors, detected, harmonyKey: harmonySelected, atmosphereKey: atmoSelected });
      await Clipboard.setStringAsync(txt);
      setCopied('report');
      setTimeout(() => setCopied(null), 2200);
    } catch (e) {
      console.warn(e);
      setError(t('errCopyReport'));
    }
  }, [colors, detected, harmonySelected, atmoSelected, t]);

  const handleExportText = useCallback(async ({ content, filename, mimeType, copiedKey, errorKey }) => {
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        setCopied(copiedKey);
      } else {
        await Clipboard.setStringAsync(content);
        setCopied(`${copiedKey}-copied`);
      }
      setTimeout(() => setCopied(null), 2200);
    } catch (e) {
      console.warn(e);
      setError(t(errorKey));
    }
  }, [t]);

  const handleExportCsv = useCallback(async () => {
    await handleExportText({
      content: buildCsv(colors), filename: 'coloranalyze-palette.csv',
      mimeType: 'text/csv;charset=utf-8;', copiedKey: 'csv', errorKey: 'errExportCsv',
    });
  }, [colors, handleExportText]);

  const handleExportJson = useCallback(async () => {
    await handleExportText({
      content: buildJson({ colors, detected, harmonyKey: harmonySelected, atmosphereKey: atmoSelected }),
      filename: 'coloranalyze-analysis.json', mimeType: 'application/json;charset=utf-8;',
      copiedKey: 'json', errorKey: 'errExportJson',
    });
  }, [colors, detected, harmonySelected, atmoSelected, handleExportText]);

  const handleExportCss = useCallback(async () => {
    await handleExportText({
      content: buildCss(colors), filename: 'coloranalyze-palette.css',
      mimeType: 'text/css;charset=utf-8;', copiedKey: 'css', errorKey: 'errExportCss',
    });
  }, [colors, handleExportText]);

  const handleExportSass = useCallback(async () => {
    await handleExportText({
      content: buildSass(colors), filename: 'coloranalyze-palette.scss',
      mimeType: 'text/plain;charset=utf-8;', copiedKey: 'sass', errorKey: 'errExportSass',
    });
  }, [colors, handleExportText]);

  // --- Image selection ---
  const pickImage = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && fileInputRef.current) {
        fileInputRef.current.click();
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t('errPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await analyze(uri);
      }
    } catch (e) {
      console.warn(e);
      setError(t('errGallery'));
    }
  }, [analyze, t]);

  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        setError(t('errInvalidFile'));
        return;
      }
      const uri = URL.createObjectURL(file);
      setImageUri(uri);
      analyze(uri);
    },
    [analyze, t]
  );

  const onFileInputChange = useCallback(
    (e) => {
      const file = e?.target?.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  const dropHandlers =
    Platform.OS === 'web'
      ? {
          onDragOver: (e) => { e.preventDefault(); if (!dragOver) setDragOver(true); },
          onDragLeave: (e) => { e.preventDefault(); setDragOver(false); },
          onDrop: (e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) handleFile(file);
          },
        }
      : {};

  const hasResult = colors.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={theme.statusBar} />

      {/* Web global transition for theme switch */}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: `
          * { transition: background-color 0.3s ease, color 0.2s ease, border-color 0.25s ease; }
        ` }} />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hidden file input (web) */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileInputChange}
            style={{ display: 'none' }}
          />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <BrandDot theme={theme} />
              <Text style={styles.title}>{t('appName')}</Text>
            </View>
            <View style={styles.headerActions}>
              <LanguageMenu />
              <ThemeToggle />
              <Pressable
                onPress={onShowLegal}
                style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel={t('legal_title')}
              >
                <Feather name="info" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>
        </View>

        {/* Dropzone */}
        <View {...dropHandlers}>
          <Pressable
            onPress={pickImage}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setDropzoneLayout({ w: width, h: height });
            }}
            style={({ pressed }) => [
              styles.dropzone,
              dragOver && styles.dropzoneActive,
              pressed && styles.dropzonePressed,
            ]}
          >
            <MarchingBorder active={dragOver} theme={theme} />
            {/* Decorative spectrum circle */}
            {!imageUri && (
              <View style={styles.spectrumWrap}>
                <View style={styles.spectrumRing}>
                  {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((h) => (
                    <View
                      key={h}
                      style={[
                        styles.spectrumDot,
                        {
                          backgroundColor: `hsl(${h}, 75%, 55%)`,
                          transform: [
                            { rotate: `${h}deg` },
                            { translateY: -18 },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}
            <Feather
              name={imageUri ? 'refresh-cw' : 'upload-cloud'}
              size={28}
              color={dragOver ? theme.accent : theme.textSecondary}
              style={styles.dropIcon}
            />
            <Text style={styles.dropTitle}>
              {imageUri ? t('importAnother') : t('importImage')}
            </Text>
            <Text style={styles.dropHint}>
              {Platform.OS === 'web' ? t('dropHintWeb') : t('dropHintMobile')}
            </Text>
          </Pressable>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Feather name="shield" size={14} color={theme.accentSecondary} />
          <Text style={styles.privacyTxt}>{t('privacyNote')}</Text>
        </View>

        {/* Image preview */}
        {imageUri ? (
          <View style={styles.previewFrame}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          </View>
        ) : null}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingTxt}>{t('analyzing')}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {hasResult && !loading && (
          <>
            {/* Tab bar with animated pill */}
            <FadeInView delay={0}>
              <TabBar
                tabs={TABS}
                activeKey={tab}
                onSelect={handleTabChange}
                theme={theme}
                t={t}
              />
            </FadeInView>

            <View style={styles.content}>
              {tab === 'palette' && (
                <>
                  <FadeInView delay={60}>
                    <View style={styles.card}>
                      <ColorPalette
                        colors={colors}
                        editable
                        numColors={numColors}
                        minColors={5}
                        maxColors={10}
                        canReset={isEdited}
                        onDeleteColor={handleDeleteColor}
                        onMergeColors={handleMergeColors}
                        onResample={handleResample}
                        onReset={handleReset}
                      />
                    </View>
                  </FadeInView>
                  <View style={{ height: 16 }} />
                  <FadeInView delay={140}>
                    <View style={styles.card}>
                      <ColorWheel colors={colors} mode={wheelMode} onModeChange={setWheelMode} />
                    </View>
                  </FadeInView>
                </>
              )}
              {tab === 'harmony' && (
                <FadeInView delay={60}>
                  <HarmonyPanel
                    colors={colors}
                    detected={detected}
                    selected={harmonySelected}
                    onSelect={setHarmonySelected}
                    imageUri={imageUri}
                  />
                </FadeInView>
              )}
              {tab === 'atmosphere' && (
                <FadeInView delay={60}>
                  <AtmospherePanel
                    colors={colors}
                    selected={atmoSelected}
                    onSelect={setAtmoSelected}
                    imageUri={imageUri}
                  />
                </FadeInView>
              )}
            </View>

            {/* Export section */}
            <FadeInView delay={200}>
              <View style={styles.actionsCard}>
                <Text style={styles.actionsTitle}>{t('exportTitle')}</Text>
                <Text style={styles.actionsHint}>{t('exportHint')}</Text>
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={handleCopyReport}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.actionBtnPrimary,
                      pressed && styles.actionBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={copied === 'report' ? t('reportCopied') : t('copyReport')}
                  >
                    <Feather
                      name={copied === 'report' ? 'check' : 'clipboard'}
                      size={15}
                      color={theme.accentOnText}
                    />
                    <Text style={[styles.actionBtnTxt, styles.actionBtnTxtPrimary]}>
                      {copied === 'report' ? t('reportCopied') : t('copyReport')}
                    </Text>
                  </Pressable>
                  {[
                    { key: 'json', icon: 'file-text', labelKey: 'exportJson', handler: handleExportJson },
                    { key: 'css', icon: 'code', labelKey: 'exportCss', handler: handleExportCss },
                    { key: 'sass', icon: 'file', labelKey: 'exportSass', handler: handleExportSass },
                    { key: 'csv', icon: 'download', labelKey: 'exportCsv', handler: handleExportCsv },
                  ].map((button) => {
                    const isDownloaded = copied === button.key;
                    const isCopied = copied === `${button.key}-copied`;
                    const label = t(button.labelKey);
                    return (
                      <Pressable
                        key={button.key}
                        onPress={button.handler}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          pressed && styles.actionBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          isDownloaded ? `${label} ${t('downloaded')}` : isCopied ? `${label} ${t('copied')}` : label
                        }
                      >
                        <Feather
                          name={isDownloaded || isCopied ? 'check' : button.icon}
                          size={15}
                          color={theme.textPrimary}
                        />
                        <Text style={styles.actionBtnTxt}>
                          {isDownloaded
                            ? `${label} ${t('downloaded')}`
                            : isCopied
                            ? `${label} ${t('copied')}`
                            : label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </FadeInView>
          </>
        )}

        <View style={{ height: 40 }} />
        <Text style={styles.footer}>{t('footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeTabStyles(t) {
  return StyleSheet.create({
    tabRow: {
      flexDirection: 'row',
      backgroundColor: t.surface,
      borderRadius: 14,
      padding: 5,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: t.border,
      position: 'relative',
    },
    tabPill: {
      position: 'absolute',
      top: 5,
      bottom: 5,
      backgroundColor: t.accent,
      borderRadius: 10,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: 10,
      zIndex: 1,
    },
    tabTxt: { fontSize: 12.5, fontWeight: '700', color: t.textSecondary },
    tabTxtActive: { color: t.accentOnText },
  });
}

function makeStyles(t) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    scroll: { padding: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },

    header: { marginBottom: 18, marginTop: 8 },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceElevated,
      borderWidth: 1,
      borderColor: t.border,
    },
    title: { fontSize: 30, fontWeight: '900', color: t.textPrimary, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: t.textSecondary, marginTop: 10, lineHeight: 20 },

    dropzone: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 0,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 38,
      paddingHorizontal: 20,
      marginBottom: 12,
      position: 'relative',
      overflow: 'hidden',
    },
    dropzoneActive: {
      backgroundColor: t.accentSoft,
    },
    dropzonePressed: {
      ...(Platform.OS === 'web' ? { transform: [{ scale: 0.985 }] } : { opacity: 0.85 }),
    },
    spectrumWrap: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 44,
      height: 44,
      marginLeft: -22,
      marginTop: -55,
      opacity: 0.2,
    },
    spectrumRing: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spectrumDot: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dropIcon: { marginBottom: 10, zIndex: 1 },
    dropTitle: { fontSize: 16, fontWeight: '700', color: t.textPrimary, zIndex: 1 },
    dropHint: { fontSize: 12.5, color: t.textSecondary, marginTop: 6, textAlign: 'center', zIndex: 1 },

    privacyNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 18,
    },
    privacyTxt: { flex: 1, fontSize: 11.5, color: t.textSecondary, lineHeight: 16 },

    previewFrame: {
      width: '100%',
      maxHeight: 220,
      height: 220,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceMuted,
      overflow: 'hidden',
      marginBottom: 18,
      padding: 8,
    },
    preview: { width: '100%', height: '100%', borderRadius: 10 },

    loadingBox: { alignItems: 'center', paddingVertical: 30 },
    loadingTxt: { marginTop: 10, color: t.textSecondary },

    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.border,
    },
    errorTxt: { color: t.danger, fontSize: 13 },

    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
    },
    content: { width: '100%' },

    actionsCard: {
      marginTop: 18,
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
    },
    actionsTitle: { fontSize: 15, fontWeight: '800', color: t.textPrimary },
    actionsHint: { fontSize: 12, color: t.textSecondary, marginTop: 6, marginBottom: 14, lineHeight: 17 },
    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: t.surfaceMuted,
      borderWidth: 1,
      borderColor: t.border,
    },
    actionBtnPrimary: { backgroundColor: t.accent, borderColor: t.accent },
    actionBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.97 }] }
        : { opacity: 0.7 }),
    },
    actionBtnTxt: { fontSize: 13, fontWeight: '700', color: t.textPrimary },
    actionBtnTxtPrimary: { color: t.accentOnText },

    footer: { textAlign: 'center', color: t.textMuted, fontSize: 11, marginTop: 10 },
  });
}
