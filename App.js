// App.js — ColorAnalyze
// Application Expo (iOS + Android + Web) d'analyse de couleurs, 100% côté client.
// Design "Studio créatif sombre" : thème clair + sombre via lib/theme.js.

import React, { useState, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';

import { getPixelData } from './lib/imagePixels';
import { extractDominantColors } from './lib/colorAnalysis';
import { detectScheme } from './lib/colorHarmony';
import { deleteColorAt, mergeColorsAt, renormalize } from './lib/paletteEdit';
import { buildReport, buildCsv, buildJson, buildCss, buildSass } from './lib/report';
import { ThemeProvider, useTheme, ThemeToggle } from './lib/theme';

import ColorPalette from './components/ColorPalette';
import ColorWheel from './components/ColorWheel';
import HarmonyPanel from './components/HarmonyPanel';
import AtmospherePanel from './components/AtmospherePanel';

import { t } from './lib/i18n';

const TABS = [
  { key: 'palette', labelKey: 'tabPalette', icon: 'aperture' },
  { key: 'harmony', labelKey: 'tabHarmony', icon: 'compass' },
  { key: 'atmosphere', labelKey: 'tabAtmosphere', icon: 'sliders' },
];

function AppContent() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [imageUri, setImageUri] = useState(null);
  const [colors, setColors] = useState([]);
  const [originalColors, setOriginalColors] = useState([]);
  const [pixelData, setPixelData] = useState(null); // { data, width, height } en cache
  const [numColors, setNumColors] = useState(null); // K courant (rééchantillonnage)
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('palette');
  const [wheelMode, setWheelMode] = useState('RGB');
  const [dragOver, setDragOver] = useState(false);

  // Sélections contrôlées (nécessaires au rapport global).
  const [harmonySelected, setHarmonySelected] = useState(null);
  const [atmoSelected, setAtmoSelected] = useState(null);
  const [copied, setCopied] = useState(null); // report | csv[-copied] | json[-copied] | css[-copied] | sass[-copied]

  const fileInputRef = useRef(null);

  const analyze = useCallback(async (uri) => {
    setLoading(true);
    setError(null);
    try {
      const pd = await getPixelData(uri);
      const extracted = extractDominantColors(pd.data, { minColors: 5, maxColors: 10 });
      if (!extracted.length) {
        throw new Error('Aucune couleur détectée dans cette image.');
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
      setError(e.message || 'Erreur lors de l\'analyse de l\'image.');
      setColors([]);
      setOriginalColors([]);
      setPixelData(null);
      setDetected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- VOLET 1 : édition de la palette ---
  const commitPalette = useCallback((next) => {
    setColors(next);
    setDetected(detectScheme(next));
    setNumColors(next.length);
  }, []);

  const handleDeleteColor = useCallback(
    (i) => {
      const next = deleteColorAt(colors, i);
      commitPalette(next);
    },
    [colors, commitPalette]
  );

  const handleMergeColors = useCallback(
    (indices) => {
      const next = mergeColorsAt(colors, indices);
      commitPalette(next);
    },
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

  // Palette modifiée ? (pour activer « Réinitialiser »)
  const isEdited = useMemo(() => {
    if (!originalColors.length) return false;
    if (colors.length !== originalColors.length) return true;
    return colors.some((c, i) => !originalColors[i] || c.hex !== originalColors[i].hex);
  }, [colors, originalColors]);

  // --- VOLET 5 : copie du rapport / exports ouverts ---
  const handleCopyReport = useCallback(async () => {
    try {
      const txt = buildReport({
        colors,
        detected,
        harmonyKey: harmonySelected,
        atmosphereKey: atmoSelected,
      });
      await Clipboard.setStringAsync(txt);
      setCopied('report');
      setTimeout(() => setCopied(null), 2200);
    } catch (e) {
      console.warn(e);
      setError('Impossible de copier le rapport.');
    }
  }, [colors, detected, harmonySelected, atmoSelected]);

  const handleExportText = useCallback(async ({ content, filename, mimeType, copiedKey, errorMessage }) => {
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
      setError(errorMessage);
    }
  }, []);

  const handleExportCsv = useCallback(async () => {
    await handleExportText({
      content: buildCsv(colors),
      filename: 'coloranalyze-palette.csv',
      mimeType: 'text/csv;charset=utf-8;',
      copiedKey: 'csv',
      errorMessage: "Impossible d'exporter le CSV.",
    });
  }, [colors, handleExportText]);

  const handleExportJson = useCallback(async () => {
    await handleExportText({
      content: buildJson({
        colors,
        detected,
        harmonyKey: harmonySelected,
        atmosphereKey: atmoSelected,
      }),
      filename: 'coloranalyze-analysis.json',
      mimeType: 'application/json;charset=utf-8;',
      copiedKey: 'json',
      errorMessage: "Impossible d'exporter le JSON.",
    });
  }, [colors, detected, harmonySelected, atmoSelected, handleExportText]);

  const handleExportCss = useCallback(async () => {
    await handleExportText({
      content: buildCss(colors),
      filename: 'coloranalyze-palette.css',
      mimeType: 'text/css;charset=utf-8;',
      copiedKey: 'css',
      errorMessage: "Impossible d'exporter le CSS.",
    });
  }, [colors, handleExportText]);

  const handleExportSass = useCallback(async () => {
    await handleExportText({
      content: buildSass(colors),
      filename: 'coloranalyze-palette.scss',
      mimeType: 'text/plain;charset=utf-8;',
      copiedKey: 'sass',
      errorMessage: "Impossible d'exporter le SASS.",
    });
  }, [colors, handleExportText]);

  // --- Sélection via expo-image-picker (mobile + fallback web) ---
  const pickImage = useCallback(async () => {
    try {
      // Sur le web, on préfère l'input file natif (permet le glisser-déposer).
      if (Platform.OS === 'web' && fileInputRef.current) {
        fileInputRef.current.click();
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Autorisation d\'accès à la galerie refusée.');
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
      setError('Impossible d\'ouvrir la galerie.');
    }
  }, [analyze]);

  // --- Gestion du fichier (web) : input file + glisser-déposer ---
  const handleFile = useCallback(
    (file) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        setError('Veuillez fournir un fichier image valide.');
        return;
      }
      const uri = URL.createObjectURL(file);
      setImageUri(uri);
      analyze(uri);
    },
    [analyze]
  );

  const onFileInputChange = useCallback(
    (e) => {
      const file = e?.target?.files?.[0];
      if (file) handleFile(file);
      // Réinitialise pour permettre de re-sélectionner le même fichier.
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile]
  );

  // Handlers de glisser-déposer (web uniquement).
  const dropHandlers =
    Platform.OS === 'web'
      ? {
          onDragOver: (e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          },
          onDragLeave: (e) => {
            e.preventDefault();
            setDragOver(false);
          },
          onDrop: (e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) handleFile(file);
          },
        }
      : {};

  const hasResult = colors.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={theme.statusBar} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Input file caché (web) */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileInputChange}
            style={{ display: 'none' }}
          />
        )}

        {/* En-tête / héros */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={styles.title}>ColorAnalyze</Text>
            </View>
            <ThemeToggle />
          </View>
          <Text style={styles.subtitle}>
            Analyse les couleurs d'une image : palette, roue chromatique, harmonies et ambiances.
          </Text>
        </View>

        {/* Zone d'import — dropzone stylée */}
        <View {...dropHandlers}>
          <Pressable
            onPress={pickImage}
            style={[styles.dropzone, dragOver && styles.dropzoneActive]}
          >
            <Feather
              name={imageUri ? 'refresh-cw' : 'upload-cloud'}
              size={28}
              color={dragOver ? theme.accent : theme.textSecondary}
              style={styles.dropIcon}
            />
            <Text style={styles.dropTitle}>
              {imageUri ? 'Choisir une autre image' : 'Importer une image'}
            </Text>
            <Text style={styles.dropHint}>
              {Platform.OS === 'web'
                ? 'Glissez-déposez une image ici, ou cliquez pour parcourir'
                : 'Touchez pour choisir une photo ou une capture d\'écran'}
            </Text>
          </Pressable>
        </View>

        {/* VOLET 6 — Note de confidentialité */}
        <View style={styles.privacyNote}>
          <Feather name="shield" size={14} color={theme.accentSecondary} />
          <Text style={styles.privacyTxt}>
            Confidentialité : l'image et les pixels restent sur votre appareil. L'application ne
            sauvegarde ni image, ni palette, ni historique. Aucune analyse, télémétrie ou donnée
            n'est transmise à un serveur ou à un service tiers pour l'analyse. Les exports sont
            initiés par vous et quittent l'application uniquement via le téléchargement, le partage
            ou le presse-papiers choisi. Sans sauvegarde persistante, l'état disparaît à la
            fermeture ou au rafraîchissement ; aucune suppression côté serveur n'est nécessaire.
          </Text>
        </View>

        {/* Aperçu borné (corrige le débordement) */}
        {imageUri ? (
          <View style={styles.previewFrame}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          </View>
        ) : null}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.loadingTxt}>Analyse des couleurs…</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {hasResult && !loading && (
          <>
            {/* Onglets — segmented control */}
            <View style={styles.tabRow}>
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => setTab(t.key)}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <Feather
                      name={t.icon}
                      size={15}
                      color={active ? theme.accentOnText : theme.textSecondary}
                    />
                    <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>
                      {t(t.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.content}>
              {tab === 'palette' && (
                <>
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
                  <View style={{ height: 16 }} />
                  <View style={styles.card}>
                    <ColorWheel colors={colors} mode={wheelMode} onModeChange={setWheelMode} />
                  </View>
                </>
              )}
              {tab === 'harmony' && (
                <HarmonyPanel
                  colors={colors}
                  detected={detected}
                  selected={harmonySelected}
                  onSelect={setHarmonySelected}
                  imageUri={imageUri}
                />
              )}
              {tab === 'atmosphere' && (
                <AtmospherePanel
                  colors={colors}
                  selected={atmoSelected}
                  onSelect={setAtmoSelected}
                  imageUri={imageUri}
                />
              )}
            </View>

            {/* VOLET 5 — Export / copie du rapport */}
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>Exporter l'analyse</Text>
              <Text style={styles.actionsHint}>
                Rapport structuré (couleurs, harmonie, disruption, consignes de retouche) et exports
                JSON, CSS, SASS et CSV de la palette.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={handleCopyReport}
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  accessibilityRole="button"
                  accessibilityLabel={copied === 'report' ? 'Rapport copié' : 'Copier le rapport'}
                >
                  <Feather
                    name={copied === 'report' ? 'check' : 'clipboard'}
                    size={15}
                    color={theme.accentOnText}
                  />
                  <Text style={[styles.actionBtnTxt, styles.actionBtnTxtPrimary]}>
                    {copied === 'report' ? 'Rapport copié !' : 'Copier le rapport'}
                  </Text>
                </Pressable>
                {[
                  {
                    key: 'json',
                    icon: 'file-text',
                    labelKey: 'exportJson',
                    short: 'JSON',
                    handler: handleExportJson,
                  },
                  {
                    key: 'css',
                    icon: 'code',
                    labelKey: 'exportCss',
                    short: 'CSS',
                    handler: handleExportCss,
                  },
                  {
                    key: 'sass',
                    icon: 'file',
                    labelKey: 'exportSass',
                    short: 'SASS',
                    handler: handleExportSass,
                  },
                  {
                    key: 'csv',
                    icon: 'download',
                    labelKey: 'exportCsv',
                    short: 'CSV',
                    handler: handleExportCsv,
                  },
                ].map((button) => {
                  const isDownloaded = copied === button.key;
                  const isCopied = copied === `${button.key}-copied`;
                  const buttonLabel = t(button.labelKey);
                  return (
                    <Pressable
                      key={button.key}
                      onPress={button.handler}
                      style={styles.actionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isDownloaded ? `${button.short} downloaded` : isCopied ? `${button.short} copied` : buttonLabel
                      }
                    >
                      <Feather
                        name={isDownloaded || isCopied ? 'check' : button.icon}
                        size={15}
                        color={theme.textPrimary}
                      />
                      <Text style={styles.actionBtnTxt}>
                        {isDownloaded
                          ? `${button.short} downloaded!`
                          : isCopied
                          ? `${button.short} copied!`
                          : buttonLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
        <Text style={styles.footer}>Traitement 100% local · aucune donnée envoyée.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
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
    brandDot: {
      width: 14,
      height: 14,
      borderRadius: 5,
      backgroundColor: t.accent,
    },
    title: { fontSize: 30, fontWeight: '900', color: t.textPrimary, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: t.textSecondary, marginTop: 10, lineHeight: 20 },

    dropzone: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: t.border,
      borderStyle: 'dashed',
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 34,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    dropzoneActive: {
      borderColor: t.accent,
      backgroundColor: t.accentSoft,
    },
    dropIcon: { marginBottom: 10 },
    dropTitle: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
    dropHint: { fontSize: 12.5, color: t.textSecondary, marginTop: 6, textAlign: 'center' },

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

    tabRow: {
      flexDirection: 'row',
      backgroundColor: t.surface,
      borderRadius: 14,
      padding: 5,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: t.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: 10,
    },
    tabActive: { backgroundColor: t.accent },
    tabIcon: { fontSize: 15 },
    tabTxt: { fontSize: 12.5, fontWeight: '700', color: t.textSecondary },
    tabTxtActive: { color: t.accentOnText },

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
    actionBtnTxt: { fontSize: 13, fontWeight: '700', color: t.textPrimary },
    actionBtnTxtPrimary: { color: t.accentOnText },

    footer: { textAlign: 'center', color: t.textMuted, fontSize: 11, marginTop: 10 },
  });
}
