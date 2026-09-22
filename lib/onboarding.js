// lib/onboarding.js
// Persistance du flag « onboarding terminé » via AsyncStorage.
// Sur le web, AsyncStorage utilise localStorage automatiquement.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@coloranalyze_onboarding_done';

export async function isOnboardingDone() {
  try {
    const val = await AsyncStorage.getItem(KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(KEY, 'true');
  } catch {
    // silently fail
  }
}

export async function resetOnboarding() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // silently fail
  }
}
