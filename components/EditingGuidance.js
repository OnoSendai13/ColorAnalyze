// components/EditingGuidance.js
// Bloc "Comment appliquer ces changements en retouche".

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutAnimation, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { buildEditingGuidance, EDITING_SOFTWARE } from '../lib/editingGuidance';
import { readableTextColor } from '../lib/colorConversions';
import { useTheme } from '../lib/theme';
import { useLang } from '../lib/i18n';

const TECHNIQUE_META = {
  tsl: { labelKey: 'techTsl', icon: 'sliders' },
  courbes: { labelKey: 'techCurves', icon: 'trending-up' },
  colorGrading: { labelKey: 'techGrading', icon: 'aperture' },
};

const TECH_ORDER = ['tsl', 'courbes', 'colorGrading'];

export default function EditingGuidance({ transforms = [], context = 'harmony' }) {
  const { theme } = useTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [openColors, setOpenColors] = useState({});
  const [softwareOpen, setSoftwareOpen] = useState(false);

  // Animated chevron for software section
  const swChevron = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(swChevron, {
      toValue: softwareOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [softwareOpen]);
  const swChevronSpin = swChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggleSoftware = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    setSoftwareOpen((v) => !v);
  };

  const guidance = useMemo(
    () => buildEditingGuidance(transforms, { context }),
    [transforms, context]
  );

  if (!transforms.length) return null;

  const { perColor, summary } = guidance;

  const toggleColor = (i) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setOpenColors((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Feather name="edit-3" size={16} color={theme.accent} />
        <Text style={styles.title}>{t('guidanceTitle')}</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryBox}>
        <View style={styles.recoRow}>
          <Text style={styles.recoLabel}>{t('mainTechnique')}</Text>
          <View style={styles.recoBadge}>
            <Feather
              name={TECHNIQUE_META[summary.recommendedGlobal].icon}
              size={13}
              color={theme.accentOnText}
            />
            <Text style={styles.recoBadgeTxt}>{summary.recommendedGlobalLabel}</Text>
          </View>
        </View>

        <View style={styles.breakdown}>
          {TECH_ORDER.map((k) => (
            <View key={k} style={styles.breakItem}>
              <View style={styles.breakTop}>
                <Feather name={TECHNIQUE_META[k].icon} size={12} color={theme.textSecondary} />
                <Text style={styles.breakName}>{t(TECHNIQUE_META[k].labelKey)}</Text>
                <Text style={styles.breakPct}>{summary.breakdown[k]}%</Text>
              </View>
              <View style={styles.breakTrack}>
                <View
                  style={[
                    styles.breakFill,
                    {
                      width: `${summary.breakdown[k]}%`,
                      backgroundColor: k === summary.recommendedGlobal ? theme.accent : theme.textMuted,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.summaryText}>{summary.text}</Text>
      </View>

      {/* Detail per color */}
      <Text style={styles.subTitle}>{t('detailPerColor')}</Text>
      {perColor.map((pc, i) => {
        const open = !!openColors[i];
        return (
          <View key={i} style={styles.colorRow}>
            <View style={styles.colorHead}>
              <View style={[styles.chip, { backgroundColor: pc.hexOrigine }]}>
                <Text style={[styles.chipPct, { color: readableTextColor(pc.hexOrigine) }]}>
                  {Math.round(pc.pourcentage)}%
                </Text>
              </View>
              <Feather name="arrow-right" size={14} color={theme.textMuted} style={styles.arrow} />
              <View style={[styles.chip, { backgroundColor: pc.hexCible }]} />

              <View style={styles.colorMeta}>
                <Text style={styles.bandName}>
                  {pc.isNeutral ? t('neutralDesaturated') : t('colorBand', { name: pc.band.label })}
                </Text>
                <View style={styles.recoInline}>
                  <Feather
                    name={TECHNIQUE_META[pc.recommended].icon}
                    size={11}
                    color={theme.accentSecondary}
                  />
                  <Text style={styles.recoInlineTxt}>{pc.recommendedLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tagRow}>
              {pc.directions.map((d, di) => (
                <View key={di} style={styles.tag}>
                  <Text style={styles.tagTxt}>{d.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.recoInstruction}>
              <Text style={styles.recoInstrTxt}>
                {pc.techniques[pc.recommended].text}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
              onPress={() => toggleColor(i)}
            >
              <Feather
                name={open ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={theme.textSecondary}
              />
              <Text style={styles.moreTxt}>
                {open ? t('hideOtherTech') : t('showAllTech')}
              </Text>
            </Pressable>

            {open && (
              <View style={styles.altBox}>
                {TECH_ORDER.map((k) => {
                  const isReco = k === pc.recommended;
                  const applicable = pc.techniques[k].applicable !== false;
                  return (
                    <View key={k} style={styles.altItem}>
                      <View style={styles.altHead}>
                        <Feather
                          name={TECHNIQUE_META[k].icon}
                          size={12}
                          color={isReco ? theme.accent : theme.textSecondary}
                        />
                        <Text style={[styles.altName, isReco && { color: theme.accent }]}>
                          {t(TECHNIQUE_META[k].labelKey)}
                          {isReco ? ` · ${t('recommended')}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.altTxt, !applicable && styles.altTxtMuted]}>
                        {pc.techniques[k].text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {/* Software list */}
      <Pressable
        style={({ pressed }) => [styles.swHeader, pressed && { opacity: 0.7 }]}
        onPress={toggleSoftware}
      >
        <Feather name="package" size={14} color={theme.textSecondary} />
        <Text style={styles.swHeaderTxt}>{t('softwareTitle')}</Text>
        <Animated.View style={{ transform: [{ rotate: swChevronSpin }] }}>
          <Feather name="chevron-down" size={15} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>
      {softwareOpen && (
        <View style={styles.swList}>
          {EDITING_SOFTWARE.map((s, i) => (
            <View key={i} style={styles.swItem}>
              <View style={styles.swNameRow}>
                <Text style={styles.swName}>{s.name}</Text>
                {s.free && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeTxt}>{t('softwareFree')}</Text>
                  </View>
                )}
              </View>
              {s.tools ? <Text style={styles.swTools}>{s.tools}</Text> : null}
            </View>
          ))}
          <Text style={styles.swFoot}>{t('softwareNote')}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    card: {
      marginTop: 18,
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    title: { fontSize: 15, fontWeight: '800', color: t.textPrimary, flexShrink: 1 },

    summaryBox: {
      backgroundColor: t.surfaceElevated,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    recoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    recoLabel: {
      fontSize: 12,
      color: t.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    recoBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.accent,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
    },
    recoBadgeTxt: { color: t.accentOnText, fontSize: 12.5, fontWeight: '800' },

    breakdown: { gap: 8, marginBottom: 12 },
    breakItem: {},
    breakTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    breakName: { flex: 1, fontSize: 12, color: t.textSecondary, fontWeight: '600' },
    breakPct: { fontSize: 12, color: t.textPrimary, fontWeight: '800' },
    breakTrack: {
      height: 6,
      borderRadius: 4,
      backgroundColor: t.surfaceMuted,
      overflow: 'hidden',
    },
    breakFill: { height: 6, borderRadius: 4 },

    summaryText: { fontSize: 12.5, color: t.textSecondary, lineHeight: 18 },

    subTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: t.textPrimary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },

    colorRow: {
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 12,
      marginBottom: 12,
    },
    colorHead: { flexDirection: 'row', alignItems: 'center' },
    chip: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.swatchBorder,
    },
    chipPct: { fontSize: 9, fontWeight: '800' },
    arrow: { marginHorizontal: 6 },
    colorMeta: { flex: 1, marginLeft: 10 },
    bandName: { fontSize: 13, fontWeight: '700', color: t.textPrimary },
    recoInline: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    recoInlineTxt: { fontSize: 11.5, fontWeight: '700', color: t.accentSecondary },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: {
      backgroundColor: t.surfaceMuted,
      borderRadius: 7,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: t.border,
    },
    tagTxt: { fontSize: 11, color: t.textSecondary, fontWeight: '600' },

    recoInstruction: {
      marginTop: 10,
      backgroundColor: t.accentSoft,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: t.border,
    },
    recoInstrTxt: { fontSize: 12.5, color: t.textPrimary, lineHeight: 18, fontWeight: '600' },

    moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    moreTxt: { fontSize: 12, color: t.textSecondary, fontWeight: '700' },

    altBox: { marginTop: 10, gap: 10 },
    altItem: {
      backgroundColor: t.surfaceMuted,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: t.border,
    },
    altHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    altName: { fontSize: 12, fontWeight: '800', color: t.textSecondary },
    altTxt: { fontSize: 12, color: t.textSecondary, lineHeight: 17 },
    altTxtMuted: { fontStyle: 'italic', color: t.textMuted },

    swHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    swHeaderTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: t.textPrimary },
    swList: { marginTop: 12, gap: 10 },
    swItem: {},
    swNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    swName: { fontSize: 12.5, fontWeight: '700', color: t.textPrimary },
    freeBadge: {
      backgroundColor: t.accentSoft,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    freeTxt: { fontSize: 10, fontWeight: '800', color: t.accentSecondary },
    swTools: { fontSize: 11.5, color: t.textSecondary, marginTop: 2, lineHeight: 16 },
    swFoot: { fontSize: 11, color: t.textMuted, fontStyle: 'italic', marginTop: 4 },
  });
}
