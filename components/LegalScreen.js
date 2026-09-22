// components/LegalScreen.js
// Écran « À propos » : politique de confidentialité, mentions légales,
// contact, évaluation, crédits, version. Conforme aux exigences Google Play
// et Apple App Store. Accessible depuis le header (icône info).

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

const APP_VERSION = '1.3.0';

// Remplacer par vos vrais liens lors de la publication
const STORE_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=com.coloranalyze.app',
  ios: 'https://apps.apple.com/app/coloranalyze/id000000000',
};

const CONTACT_EMAIL = 'contact@coloranalyze.app';

function Section({ icon, titleKey, children, theme, t, defaultOpen = false }) {
  const styles = useMemo(() => makeSectionStyles(theme), [theme]);
  const [open, setOpen] = useState(defaultOpen);
  const chevron = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chevron, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open]);

  const spin = chevron.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.7 }]}
      >
        <Feather name={icon} size={16} color={theme.accent} />
        <Text style={styles.sectionTitle}>{t(titleKey)}</Text>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Feather name="chevron-down" size={16} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export default function LegalScreen({ onClose }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const openLink = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleRate = () => {
    const url = Platform.OS === 'ios' ? STORE_LINKS.ios : STORE_LINKS.android;
    openLink(url);
  };

  const handleContact = () => {
    openLink(`mailto:${CONTACT_EMAIL}?subject=ColorAnalyze%20v${APP_VERSION}`);
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="arrow-left" size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('legal_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* App identity */}
        <View style={styles.identityCard}>
          <View style={styles.identityDot}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, backgroundColor: '#FF6B6B' }} />
              <View style={{ flex: 1, backgroundColor: '#7C5CFF' }} />
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1, backgroundColor: '#37E0C6' }} />
              <View style={{ flex: 1, backgroundColor: '#E0A100' }} />
            </View>
          </View>
          <Text style={styles.identityName}>ColorAnalyze</Text>
          <Text style={styles.identityVersion}>v{APP_VERSION}</Text>
          <Text style={styles.identityTagline}>{t('legal_tagline')}</Text>
        </View>

        {/* Quick action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleRate}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <Feather name="star" size={20} color={theme.accent} />
            <Text style={styles.actionLabel}>{t('legal_rate')}</Text>
          </Pressable>
          <Pressable
            onPress={handleContact}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <Feather name="mail" size={20} color={theme.accent} />
            <Text style={styles.actionLabel}>{t('legal_contact')}</Text>
          </Pressable>
          <Pressable
            onPress={() => openLink(`mailto:${CONTACT_EMAIL}?subject=Bug%20Report%20ColorAnalyze%20v${APP_VERSION}`)}
            style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
          >
            <Feather name="alert-circle" size={20} color={theme.accent} />
            <Text style={styles.actionLabel}>{t('legal_reportBug')}</Text>
          </Pressable>
        </View>

        {/* Privacy Policy — REQUIRED by Google Play & Apple */}
        <Section icon="shield" titleKey="legal_privacyTitle" theme={theme} t={t} defaultOpen>
          <Text style={styles.p}>{t('legal_privacyIntro')}</Text>

          <Text style={styles.h3}>{t('legal_dataCollectedTitle')}</Text>
          <Text style={styles.p}>{t('legal_dataCollectedBody')}</Text>

          <Text style={styles.h3}>{t('legal_dataStorageTitle')}</Text>
          <Text style={styles.p}>{t('legal_dataStorageBody')}</Text>

          <Text style={styles.h3}>{t('legal_thirdPartyTitle')}</Text>
          <Text style={styles.p}>{t('legal_thirdPartyBody')}</Text>

          <Text style={styles.h3}>{t('legal_childrenTitle')}</Text>
          <Text style={styles.p}>{t('legal_childrenBody')}</Text>

          <Text style={styles.h3}>{t('legal_changesTitle')}</Text>
          <Text style={styles.p}>{t('legal_changesBody')}</Text>

          <Text style={styles.pMuted}>{t('legal_privacyDate')}</Text>
        </Section>

        {/* Terms of Use */}
        <Section icon="file-text" titleKey="legal_termsTitle" theme={theme} t={t}>
          <Text style={styles.p}>{t('legal_termsBody')}</Text>
        </Section>

        {/* Credits */}
        <Section icon="code" titleKey="legal_creditsTitle" theme={theme} t={t}>
          <Text style={styles.p}>{t('legal_creditsBody')}</Text>

          <View style={styles.creditsList}>
            {[
              { name: 'React Native / Expo', role: 'Framework' },
              { name: 'react-native-svg', role: 'SVG' },
              { name: 'upng-js', role: 'PNG decoding' },
              { name: '@expo/vector-icons (Feather)', role: 'Icons' },
            ].map((c, i) => (
              <View key={i} style={styles.creditItem}>
                <Text style={styles.creditName}>{c.name}</Text>
                <Text style={styles.creditRole}>{c.role}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Contact / Support */}
        <Section icon="message-circle" titleKey="legal_supportTitle" theme={theme} t={t}>
          <Text style={styles.p}>{t('legal_supportBody')}</Text>

          <Pressable
            onPress={handleContact}
            style={({ pressed }) => [styles.contactBtn, pressed && styles.contactBtnPressed]}
          >
            <Feather name="mail" size={16} color={theme.accentOnText} />
            <Text style={styles.contactBtnTxt}>{CONTACT_EMAIL}</Text>
          </Pressable>
        </Section>

        {/* Legal notice */}
        <View style={styles.legalNotice}>
          <Text style={styles.legalTxt}>{t('legal_notice')}</Text>
          <Text style={styles.legalTxt}>© {new Date().getFullYear()} ColorAnalyze</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeSectionStyles(t) {
  return StyleSheet.create({
    section: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 16,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: t.textPrimary,
    },
    sectionBody: {
      padding: 16,
      paddingTop: 0,
    },
  });
}

function makeStyles(t) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'web' ? 12 : 52,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.surface,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: t.textPrimary,
    },
    scroll: {
      padding: 16,
      maxWidth: 760,
      width: '100%',
      alignSelf: 'center',
    },

    // Identity card
    identityCard: {
      alignItems: 'center',
      paddingVertical: 28,
      marginBottom: 20,
    },
    identityDot: {
      width: 48,
      height: 48,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
    },
    identityName: {
      fontSize: 26,
      fontWeight: '900',
      color: t.textPrimary,
      letterSpacing: -0.5,
    },
    identityVersion: {
      fontSize: 13,
      fontWeight: '700',
      color: t.textMuted,
      marginTop: 4,
    },
    identityTagline: {
      fontSize: 14,
      color: t.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },

    // Quick actions
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    actionCard: {
      flex: 1,
      alignItems: 'center',
      gap: 8,
      paddingVertical: 18,
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    actionCardPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.97 }] }
        : { opacity: 0.7 }),
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: t.textSecondary,
      textAlign: 'center',
    },

    // Text styles
    h3: {
      fontSize: 14,
      fontWeight: '800',
      color: t.textPrimary,
      marginTop: 14,
      marginBottom: 6,
    },
    p: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 20,
      marginBottom: 6,
    },
    pMuted: {
      fontSize: 12,
      color: t.textMuted,
      fontStyle: 'italic',
      marginTop: 10,
    },

    // Credits
    creditsList: {
      marginTop: 10,
      gap: 8,
    },
    creditItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: t.surfaceMuted,
    },
    creditName: {
      fontSize: 13,
      fontWeight: '700',
      color: t.textPrimary,
    },
    creditRole: {
      fontSize: 12,
      color: t.textMuted,
    },

    // Contact
    contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 12,
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 14,
    },
    contactBtnPressed: {
      ...(Platform.OS === 'web'
        ? { transform: [{ translateY: 1 }, { scale: 0.98 }] }
        : { opacity: 0.85 }),
    },
    contactBtnTxt: {
      fontSize: 14,
      fontWeight: '800',
      color: t.accentOnText,
    },

    // Legal notice
    legalNotice: {
      marginTop: 10,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 4,
    },
    legalTxt: {
      fontSize: 11,
      color: t.textMuted,
      textAlign: 'center',
    },
  });
}
