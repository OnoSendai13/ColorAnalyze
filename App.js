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
import { Feather } from '@expo/vector-icons';

import { getPixelData } from './lib/imagePixels';
import { extractDominantColors } from './lib/colorAnalysis';
import { detectScheme } from './lib/colorHarmony';
import { ThemeProvider, useTheme, ThemeToggle } from './lib/theme';

import ColorPalette from './components/ColorPalette';
import ColorWheel from './components/ColorWheel';
import HarmonyPanel from './components/HarmonyPanel';
import AtmospherePanel from './components/AtmospherePanel';

const TABS = [
  { key: 'palette', label: 'Palette & Roue', icon: 'aperture' },
  { key: 'harmony', label: 'Harmonies', icon: 'compass' },
  { key: 'atmosphere', label: 'Ambiances', icon: 'sliders' },
];

function AppContent() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [imageUri, setImageUri] = useState(null);
  const [colors, setColors] = useState([]);
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('palette');
  const [wheelMode, setWheelMode] = useState('RGB');
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const analyze = useCallback(async (uri) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getPixelData(uri);
      const extracted = extractDominantColors(data, { minColors: 5, maxColors: 10 });
      if (!extracted.length) {
        throw new Error('Aucune couleur détectée dans cette image.');
      }
      setColors(extracted);
      setDetected(detectScheme(extracted));
      setTab('palette');
    } catch (e) {
      console.warn(e);
      setError(e.message || 'Erreur lors de l\'analyse de l\'image.');
      setColors([]);
      setDetected(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.content}>
              {tab === 'palette' && (
                <>
                  <View style={styles.card}>
                    <ColorPalette colors={colors} />
                  </View>
                  <View style={{ height: 16 }} />
                  <View style={styles.card}>
                    <ColorWheel colors={colors} mode={wheelMode} onModeChange={setWheelMode} />
                  </View>
                </>
              )}
              {tab === 'harmony' && <HarmonyPanel colors={colors} detected={detected} />}
              {tab === 'atmosphere' && <AtmospherePanel colors={colors} />}
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
      marginBottom: 16,
    },
    dropzoneActive: {
      borderColor: t.accent,
      backgroundColor: t.accentSoft,
    },
    dropIcon: { marginBottom: 10 },
    dropTitle: { fontSize: 16, fontWeight: '700', color: t.textPrimary },
    dropHint: { fontSize: 12.5, color: t.textSecondary, marginTop: 6, textAlign: 'center' },

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
    footer: { textAlign: 'center', color: t.textMuted, fontSize: 11, marginTop: 10 },
  });
}
