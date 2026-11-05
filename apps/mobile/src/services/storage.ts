import AsyncStorage from '@react-native-async-storage/async-storage'
import { createJSONStorage } from 'zustand/middleware'

/**
 * Stockage des stores persistants (panier, favoris, préférences). AsyncStorage n'a pas
 * la limite d'environ 2 Ko par valeur de SecureStore, réservé aux jetons de session.
 */
export const persistentStorage = createJSONStorage(() => AsyncStorage)
