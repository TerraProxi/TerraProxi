import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as NativeSplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat'
import {
  OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold, OpenSans_700Bold, OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans'
import { RootNavigator } from './src/navigation/RootNavigator'
import { WebBackOfficeScreen } from './src/screens/WebBackOfficeScreen'
import { useUiStore } from './src/store/ui.store'
import { useAuthStore } from './src/store/auth.store'

// L'écran de démarrage natif reste affiché jusqu'au chargement des polices de la charte
void NativeSplashScreen.preventAutoHideAsync()

export default function App() {
  const darkMode = useUiStore((s) => s.darkMode)
  const initializeAuth = useAuthStore((s) => s.initialize)
  const user = useAuthStore((s) => s.user)
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    OpenSans_700Bold,
    OpenSans_800ExtraBold,
  })
  // En cas d'échec de chargement, l'application garde les polices système plutôt que de bloquer
  const isFontStepDone = fontsLoaded || fontError !== null

  // Restaure la session enregistrée (SecureStore) dès le lancement
  useEffect(() => { void initializeAuth() }, [initializeAuth])

  useEffect(() => {
    if (isFontStepDone) void NativeSplashScreen.hideAsync()
  }, [isFontStepDone])

  if (!isFontStepDone) return null

  // Application réservée aux consommateurs : les producteurs utilisent le back-office web
  const isConsumerSession = !user || user.role === 'CONSUMER'

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {isConsumerSession ? <RootNavigator /> : <WebBackOfficeScreen />}
    </SafeAreaProvider>
  )
}
