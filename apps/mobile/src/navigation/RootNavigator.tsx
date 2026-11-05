import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { TabNavigator } from './TabNavigator'
import { SplashScreen } from '../screens/SplashScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { ProducerProfileScreen } from '../screens/ProducerProfileScreen'
import { CatalogScreen } from '../screens/CatalogScreen'
import { CartScreen } from '../screens/CartScreen'
import { CheckoutScreen } from '../screens/CheckoutScreen'
import { MessagesScreen } from '../screens/MessagesScreen'
import { ChatScreen } from '../screens/ChatScreen'
import { OrdersScreen } from '../screens/OrdersScreen'
import { FavoritesScreen } from '../screens/FavoritesScreen'
import { ProductDetailScreen } from '../screens/ProductDetailScreen'
import { EditProfileScreen } from '../screens/EditProfileScreen'
import { ChangeEmailScreen } from '../screens/ChangeEmailScreen'
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { useUiStore } from '../store/ui.store'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { navigationRef, flushPendingNotificationTarget } from './navigationRef'
import { Colors, Fonts } from '../theme'

export type RootStackParamList = {
  Splash: undefined
  Onboarding: undefined
  Tabs: undefined
  Login: undefined
  Register: undefined
  ProducerProfile: { producerId: string }
  Catalog: { producerId: string }
  ProductDetail: { productId: string }
  Cart: undefined
  Orders: undefined
  Checkout: { orderId: string; pendingOrderIds?: string[] }
  Messages: undefined
  Favorites: undefined
  /** partnerName absent quand on vient d'une notification : l'écran le retrouve. */
  Conversation: { partnerId: string; partnerName?: string }
  EditProfile: undefined
  ChangeEmail: undefined
  ChangePassword: undefined
  Notifications: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const darkMode = useUiStore((s) => s.darkMode)
  usePushNotifications()

  const navigationTheme = darkMode
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: '#0B1220',
        card: '#111827',
        border: '#1F2937',
        text: '#F3F4F6',
        primary: Colors.primary,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: '#F9FAFB',
        card: '#FFFFFF',
        border: '#E5E7EB',
        text: '#1F2937',
        // Teinte des boutons d'en-tête : variante foncée pour le contraste sur fond blanc
        primary: Colors.primaryDark,
      },
    }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={flushPendingNotificationTarget}
      onStateChange={flushPendingNotificationTarget}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerBackTitle: 'Retour',
          headerBackAccessibilityLabel: 'Retour',
          headerTitleStyle: { fontFamily: Fonts.title },
        }}
        initialRouteName="Splash"
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: true, title: 'Connexion' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Inscription' }} />
        <Stack.Screen name="ProducerProfile" component={ProducerProfileScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true, title: 'Mes commandes' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Paiement' }} />
        <Stack.Screen name="Messages" component={MessagesScreen} options={{ headerShown: true, title: 'Messages' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: 'Mes favoris' }} />
        <Stack.Screen name="Conversation" component={ChatScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Produit' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Mon profil' }} />
        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} options={{ headerShown: true, title: 'Adresse email' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Mot de passe' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
