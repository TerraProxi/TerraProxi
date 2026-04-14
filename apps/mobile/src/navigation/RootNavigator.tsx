import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuthStore } from '../store/auth.store'
import { TabNavigator } from './TabNavigator'
import { LoginScreen }    from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { ProducerProfileScreen } from '../screens/ProducerProfileScreen'
import { CheckoutScreen }        from '../screens/CheckoutScreen'
import { MessagesScreen }        from '../screens/MessagesScreen'
import { ConversationScreen }    from '../screens/ConversationScreen'

export type RootStackParamList = {
  Tabs:            undefined
  Login:           undefined
  Register:        undefined
  ProducerProfile: { producerId: string }
  Checkout:        { orderId: string }
  Messages:        undefined
  Conversation:    { partnerId: string; partnerName: string }
}

const Stack = createStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const { isAuthenticated, initialize } = useAuthStore()

  useEffect(() => { initialize() }, [])

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs"            component={TabNavigator} />
        <Stack.Screen name="Login"           component={LoginScreen} options={{ headerShown: true, title: 'Connexion' }} />
        <Stack.Screen name="Register"        component={RegisterScreen} options={{ headerShown: true, title: 'Inscription' }} />
        <Stack.Screen name="ProducerProfile" component={ProducerProfileScreen} options={{ headerShown: true, title: 'Producteur' }} />
        <Stack.Screen name="Checkout"        component={CheckoutScreen} options={{ headerShown: true, title: 'Paiement' }} />
        <Stack.Screen name="Messages"        component={MessagesScreen} options={{ headerShown: true, title: 'Messages' }} />
        <Stack.Screen name="Conversation"    component={ConversationScreen} options={{ headerShown: true }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
