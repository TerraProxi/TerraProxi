// Doit rester le premier import : requis par @react-navigation/stack (gestes natifs).
import 'react-native-gesture-handler'
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
