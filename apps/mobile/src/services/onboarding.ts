import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_SEEN_KEY = 'onboarding-seen'

/** L'onboarding n'est présenté qu'au premier lancement. */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true'
  } catch {
    // Stockage illisible : mieux vaut remontrer l'onboarding que bloquer le démarrage
    return false
  }
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
}
