// lib/theme.js
// Système de thème "Studio créatif sombre" : tokens clair + sombre,
// contexte React, provider, hook useTheme et composant ThemeToggle.
// Aucune couleur d'UI ne doit être codée en dur ailleurs : tout passe par ces tokens.

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Appearance, Pressable, Text, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
// Principes :
// - Jamais de noir pur ni de blanc pur (halation).
// - Profondeur par élévation de surface (gris étagés), pas par ombres marquées.
// - UI neutre pour laisser ressortir les couleurs analysées + 1 accent principal.

const ACCENT = '#7C5CFF'; // violet-indigo électrique
const ACCENT_SECONDARY = '#37E0C6'; // cyan (états positifs / actifs)

export const DARK = {
  name: 'dark',
  accent: ACCENT,
  accentSecondary: ACCENT_SECONDARY,
  accentSoft: 'rgba(124,92,255,0.16)',
  accentOnText: '#FFFFFF',

  bg: '#0F1115', // fond de l'app
  surface: '#1A1D24', // cartes
  surfaceElevated: '#242833', // surfaces surélevées / éléments actifs
  surfaceMuted: '#1F232B', // fonds discrets (pistes, chips inactifs)

  textPrimary: '#E6E8EC',
  textSecondary: '#9098A6',
  textMuted: '#6A7180',

  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',

  // Statuts (score de disruption, erreurs…)
  success: '#37E0C6',
  warning: '#E0A100',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.14)',

  overlayOnColor: 'rgba(0,0,0,0.35)', // ombrage léger posé sur une puce couleur
  chipStroke: 'rgba(255,255,255,0.14)',
  statusBar: 'light',
  isDark: true,
};

export const LIGHT = {
  name: 'light',
  accent: ACCENT,
  accentSecondary: '#12B39A',
  accentSoft: 'rgba(124,92,255,0.12)',
  accentOnText: '#FFFFFF',

  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F1F4',
  surfaceMuted: '#EEF0F3',

  textPrimary: '#16181D',
  textSecondary: '#5A6072',
  textMuted: '#8A90A0',

  border: '#E6E8EC',
  borderStrong: '#D6D9E0',

  success: '#12B39A',
  warning: '#C98A00',
  danger: '#D64545',
  dangerSoft: '#FDECEC',

  overlayOnColor: 'rgba(0,0,0,0.22)',
  chipStroke: 'rgba(0,0,0,0.10)',
  statusBar: 'dark',
  isDark: false,
};

export const THEMES = { dark: DARK, light: LIGHT };

// ---------------------------------------------------------------------------
// Contexte
// ---------------------------------------------------------------------------

const ThemeContext = createContext({
  theme: DARK,
  mode: 'dark',
  toggleTheme: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  // Respecte prefers-color-scheme / useColorScheme au 1er lancement.
  const initial = Appearance.getColorScheme?.() === 'light' ? 'light' : 'dark';
  const [mode, setMode] = useState(initial);

  const toggleTheme = useCallback(() => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      theme: THEMES[mode] || DARK,
      mode,
      toggleTheme,
      setMode,
    }),
    [mode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ---------------------------------------------------------------------------
// Toggle clair / sombre
// ---------------------------------------------------------------------------

export function ThemeToggle() {
  const { theme, mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      onPress={toggleTheme}
      style={({ pressed }) => [
        toggleStyles.btn,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={toggleStyles.icon}>{isDark ? '☀️' : '🌙'}</Text>
    </Pressable>
  );
}

const toggleStyles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
});
