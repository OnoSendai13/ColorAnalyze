// components/ImagePreview.js
// Prévisualisation AVANT / APRÈS de la PHOTO re-teintée selon un mapping de
// couleurs (schéma d'harmonie ou ambiance).
//
// - Web : re-teinte réelle des pixels via un <canvas> (garde Platform.OS).
// - Mobile : repli propre (note + comparaison de palettes déjà affichée par les
//   panneaux), la manipulation pixel par pixel via upng étant trop coûteuse.

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { recolorRGBA } from '../lib/imageRecolor';

const MAX_PREVIEW = 480; // dimension max de travail du canvas (perf)

export default function ImagePreview({ imageUri, mappings = [], title = 'Prévisualisation sur l\'image' }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [view, setView] = useState('after'); // 'before' | 'after'
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const canvasRef = useRef(null);
  const beforeDataRef = useRef(null); // ImageData originale
  const afterDataRef = useRef(null); // ImageData transformée
  const dimsRef = useRef({ w: 0, h: 0 });

  const isWeb = Platform.OS === 'web';

  // Signature stable des mappings pour re-déclencher le calcul quand ils changent.
  const sig = useMemo(
    () =>
      (mappings || [])
        .map((m) => `${m.hexOrigine || ''}>${m.hexCible || ''}`)
        .join('|'),
    [mappings]
  );

  // Charge l'image + calcule la version transformée (web uniquement).
  useEffect(() => {
    if (!isWeb || !imageUri || !mappings.length) return;
    let cancelled = false;
    setReady(false);
    setFailed(false);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        let { width, height } = img;
        const scale = Math.min(1, MAX_PREVIEW / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        dimsRef.current = { w: width, h: height };

        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, width, height);
        const original = octx.getImageData(0, 0, width, height);
        beforeDataRef.current = original;

        const recolored = recolorRGBA(original.data, mappings);
        afterDataRef.current = new ImageData(recolored, width, height);

        setReady(true);
      } catch (e) {
        console.warn('ImagePreview:', e);
        setFailed(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = imageUri;
    return () => {
      cancelled = true;
    };
  }, [isWeb, imageUri, sig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Peint le canvas visible selon la vue choisie.
  useEffect(() => {
    if (!isWeb || !ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = dimsRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const data = view === 'before' ? beforeDataRef.current : afterDataRef.current;
    if (data) ctx.putImageData(data, 0, 0);
  }, [isWeb, ready, view, sig]);

  if (!imageUri || !mappings.length) return null;

  // ---- Repli mobile ----
  if (!isWeb) {
    return (
      <View style={styles.wrap}>
        <View style={styles.titleRow}>
          <Feather name="image" size={15} color={theme.textSecondary} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.fallback}>
          <Feather name="monitor" size={18} color={theme.textMuted} />
          <Text style={styles.fallbackTxt}>
            Prévisualisation de l'image complète disponible sur la version web. Ici, comparez la
            palette d'origine et la palette transformée ci-dessus.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Feather name="image" size={15} color={theme.textSecondary} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('before')}
          style={[styles.toggleBtn, view === 'before' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleTxt, view === 'before' && styles.toggleTxtActive]}>Avant</Text>
        </Pressable>
        <Pressable
          onPress={() => setView('after')}
          style={[styles.toggleBtn, view === 'after' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleTxt, view === 'after' && styles.toggleTxtActive]}>Après</Text>
        </Pressable>
      </View>

      <View style={styles.frame}>
        {failed ? (
          <Text style={styles.errTxt}>Impossible de générer la prévisualisation de l'image.</Text>
        ) : !ready ? (
          <Text style={styles.loadingTxt}>Génération de la prévisualisation…</Text>
        ) : (
          // Élément DOM natif (web) : rendu via react-native-web.
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: 240,
              width: 'auto',
              height: 'auto',
              borderRadius: 10,
              display: 'block',
              margin: '0 auto',
              objectFit: 'contain',
            }}
          />
        )}
      </View>
      <Text style={styles.caption}>
        {view === 'before'
          ? 'Image d\'origine.'
          : 'Rendu simulé : chaque zone reçoit le décalage de teinte de la couleur la plus proche.'}
      </Text>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    wrap: { width: '100%', marginTop: 18 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
    title: { fontSize: 13, fontWeight: '800', color: t.textPrimary },
    toggleRow: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      backgroundColor: t.surfaceMuted,
      borderRadius: 10,
      padding: 4,
      gap: 4,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.border,
    },
    toggleBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 7 },
    toggleBtnActive: { backgroundColor: t.accent },
    toggleTxt: { fontSize: 12.5, fontWeight: '700', color: t.textSecondary },
    toggleTxtActive: { color: t.accentOnText },
    frame: {
      width: '100%',
      minHeight: 120,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      overflow: 'hidden',
    },
    loadingTxt: { color: t.textSecondary, fontSize: 12, paddingVertical: 30 },
    errTxt: { color: t.danger, fontSize: 12, paddingVertical: 30 },
    caption: { marginTop: 10, fontSize: 11, color: t.textMuted, lineHeight: 16 },
    fallback: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: t.surfaceMuted,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    fallbackTxt: { flex: 1, color: t.textSecondary, fontSize: 12, lineHeight: 17 },
  });
}
