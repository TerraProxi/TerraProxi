import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { TabNavigator } from './TabNavigator'
import { SplashScreen } from '../screens/SplashScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { AuthScreen } from '../screens/AuthScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { ProducerProfileScreen } from '../screens/ProducerProfileScreen'
import { CatalogScreen } from '../screens/CatalogScreen'
import { CartScreen } from '../screens/CartScreen'
import { CheckoutScreen } from '../screens/CheckoutScreen'
import { MessagesScreen } from '../screens/MessagesScreen'
import { ChatScreen } from '../screens/ChatScreen'

export type RootStackParamList = {
  Splash: undefined
  Onboarding: undefined
  Auth: undefined
  Tabs: undefined
  Login: undefined
  Register: undefined
  ProducerProfile: { producerId: string }
  Catalog: { producerId: string }
  Cart: undefined
  Checkout: { orderId: string }
  Messages: undefined
  Conversation: { partnerId: string; partnerName: string }
}

const Stack = createStackNavigator<RootStackParamList>()

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: 'Connexion' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Inscription' }} />
        <Stack.Screen name="ProducerProfile" component={ProducerProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Paiement' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: true, title: 'Messages' }} />
        <Stack.Screen name="Conversation" component={ChatScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
