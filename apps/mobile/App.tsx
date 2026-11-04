import { useEffect } from 'react'
import { RootNavigator } from './src/navigation/RootNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useUiStore } from './src/store/ui.store'
import { useAuthStore } from './src/store/auth.store'

export default function App() {
  const darkMode = useUiStore((s) => s.darkMode)
  const initializeAuth = useAuthStore((s) => s.initialize)

  // Restaure la session enregistrée (SecureStore) dès le lancement
  useEffect(() => { void initializeAuth() }, [initializeAuth])

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  )
}
