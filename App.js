// App.js — ColorAnalyze
// Application Expo (iOS + Android + Web) d'analyse de couleurs, 100% côté client.

import React, { useState, useCallback } from 'react';
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

import { getPixelData } from './lib/imagePixels';
import { extractDominantColors } from './lib/colorAnalysis';
import { detectScheme } from './lib/colorHarmony';

import ColorPalette from './components/ColorPalette';
import ColorWheel from './components/ColorWheel';
import HarmonyPanel from './components/HarmonyPanel';
import AtmospherePanel from './components/AtmospherePanel';

const TABS = [
  { key: 'palette', label: 'Palette & Roue', icon: '🎨' },
  { key: 'harmony', label: 'Harmonies', icon: '🧭' },
  { key: 'atmosphere', label: 'Ambiances', icon: '🌈' },
];

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [colors, setColors] = useState([]);
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('palette');
  const [wheelMode, setWheelMode] = useState('RGB');

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

  const pickImage = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError('Autorisation d\'accès à la galerie refusée.');
          return;
        }
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

  const hasResult = colors.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>ColorAnalyze</Text>
          <Text style={styles.subtitle}>
            Analyse les couleurs d'une image : palette, roue chromatique, harmonies et ambiances.
          </Text>
        </View>

        {/* Import */}
        <Pressable style={styles.importBtn} onPress={pickImage}>
          <Text style={styles.importBtnTxt}>
            {imageUri ? '🔄 Choisir une autre image' : '📷 Importer une image'}
          </Text>
        </Pressable>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTxt}>
              Importe une photo ou une capture d'écran pour commencer.
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#333" />
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
            {/* Onglets */}
            <View style={styles.tabRow}>
              {TABS.map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tab, tab === t.key && styles.tabActive]}
                >
                  <Text style={styles.tabIcon}>{t.icon}</Text>
                  <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.content}>
              {tab === 'palette' && (
                <>
                  <ColorPalette colors={colors} />
                  <View style={{ height: 24 }} />
                  <ColorWheel
                    colors={colors}
                    mode={wheelMode}
                    onModeChange={setWheelMode}
                  />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 30, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#777', marginTop: 6, lineHeight: 20 },
  importBtn: {
    backgroundColor: '#5B6EF5',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  importBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#EEE',
  },
  placeholder: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 20,
  },
  placeholderTxt: { color: '#AAA', textAlign: 'center', fontSize: 14 },
  loadingBox: { alignItems: 'center', paddingVertical: 30 },
  loadingTxt: { marginTop: 10, color: '#555' },
  errorBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  errorTxt: { color: '#C0392B', fontSize: 13 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F4',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabIcon: { fontSize: 15 },
  tabTxt: { fontSize: 12.5, fontWeight: '600', color: '#888' },
  tabTxtActive: { color: '#1A1A1A' },
  content: { width: '100%' },
  footer: { textAlign: 'center', color: '#BBB', fontSize: 11, marginTop: 10 },
});
