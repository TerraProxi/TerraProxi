import { RootNavigator } from './src/navigation/RootNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useUiStore } from './src/store/ui.store'

export default function App() {
  const darkMode = useUiStore((s) => s.darkMode)

  return (
    <SafeAreaProvider>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  )
}
