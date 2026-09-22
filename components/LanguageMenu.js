// components/LanguageMenu.js
// Sélecteur de langue React Native pur.
// Approche : boutons inline qui s'échangent au clic (pas de dropdown/overlay
// qui pose des problèmes de z-index dans le ScrollView de react-native-web).

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useLang, languages } from '../lib/i18n';

export default function LanguageMenu() {
  const { theme } = useTheme();
  const { lang, setLang, t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {languages.map((l) => {
        const isActive = lang === l;
        const label = l.toUpperCase();
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={({ pressed }) => [
              styles.btn,
              isActive && styles.btnActive,
              pressed && !isActive && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('lang' + l.toUpperCase())}
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.btnTxt, isActive && styles.btnTxtActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: t.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      padding: 3,
      gap: 2,
    },
    btn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 7,
    },
    btnActive: {
      backgroundColor: t.accent,
    },
    btnPressed: {
      backgroundColor: t.surfaceMuted,
    },
    btnTxt: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textMuted,
      letterSpacing: 0.5,
    },
    btnTxtActive: {
      color: t.accentOnText,
      fontWeight: '800',
    },
  });
}
