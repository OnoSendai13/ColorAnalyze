// components/ImagePreview.js
// Prévisualisation AVANT / APRÈS de la PHOTO re-teintée selon un mapping de couleurs.

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';
import { recolorRGBA } from '../lib/imageRecolor';

const MAX_PREVIEW = 480;

export default function ImagePreview({ imageUri, mappings = [], title }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const displayTitle = title || t('previewImage');
  const [view, setView] = useState('after');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const canvasRef = useRef(null);
  const beforeDataRef = useRef(null);
  const afterDataRef = useRef(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const isWeb = Platform.OS === 'web';

  const sig = useMemo(
    () => (mappings || []).map((m) => `${m.hexOrigine || ''}>${m.hexCible || ''}`).join('|'),
    [mappings]
  );

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
    img.onerror = () => { if (!cancelled) setFailed(true); };
    img.src = imageUri;
    return () => { cancelled = true; };
  }, [isWeb, imageUri, sig]);

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

  if (!isWeb) {
    return (
      <View style={styles.wrap}>
        <View style={styles.titleRow}>
          <Feather name="image" size={15} color={theme.textSecondary} />
          <Text style={styles.title}>{displayTitle}</Text>
        </View>
        <View style={styles.fallback}>
          <Feather name="monitor" size={18} color={theme.textMuted} />
          <Text style={styles.fallbackTxt}>{t('previewFallback')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Feather name="image" size={15} color={theme.textSecondary} />
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('before')}
          style={({ pressed }) => [
            styles.toggleBtn,
            view === 'before' && styles.toggleBtnActive,
            pressed && styles.toggleBtnPressed,
          ]}
        >
          <Text style={[styles.toggleTxt, view === 'before' && styles.toggleTxtActive]}>{t('previewBefore')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setView('after')}
          style={({ pressed }) => [
            styles.toggleBtn,
            view === 'after' && styles.toggleBtnActive,
            pressed && styles.toggleBtnPressed,
          ]}
        >
          <Text style={[styles.toggleTxt, view === 'after' && styles.toggleTxtActive]}>{t('previewAfter')}</Text>
        </Pressable>
      </View>

      <View style={styles.frame}>
        {failed ? (
          <Text style={styles.errTxt}>{t('previewError')}</Text>
        ) : !ready ? (
          <Text style={styles.loadingTxt}>{t('previewGenerate')}</Text>
        ) : (
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
        {view === 'before' ? t('previewCapBefore') : t('previewCapAfter')}
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
    toggleBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ scale: 0.96 }] }
        : { opacity: 0.7 }),
    },
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
