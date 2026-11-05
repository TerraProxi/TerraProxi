import { createBottomTabNavigator, type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { MapScreen } from '../screens/MapScreen'
import { ShopListScreen } from '../screens/ShopListScreen'
import { AiAssistantScreen } from '../screens/AiAssistantScreen'
import { UserProfileScreen } from '../screens/UserProfileScreen'
import { CartScreen } from '../screens/CartScreen'
import { Colors, Fonts } from '../theme'
import { useUiStore } from '../store/ui.store'
import { useCartStore } from '../store/cart.store'
import { useUnreadStore } from '../store/unread.store'
import { useUnreadPolling } from '../hooks/useUnreadPolling'

const Tab = createBottomTabNavigator()

function AssistantButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  return (
    <TouchableOpacity
      style={styles.assistantButton}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel="Assistant TerraProxi"
      accessibilityState={accessibilityState}
    >
      <View style={styles.assistantButtonInner}>
        <MaterialCommunityIcons name="robot-happy-outline" size={26} color={Colors.white} />
      </View>
    </TouchableOpacity>
  )
}

const badgeStyle = {
  backgroundColor: Colors.primaryDark,
  color: Colors.white,
  fontFamily: Fonts.bold,
}

export function TabNavigator() {
  const darkMode = useUiStore((s) => s.darkMode)
  const cartCount = useCartStore((s) => s.count)
  const unreadCount = useUnreadStore((s) => s.count)
  useUnreadPolling()

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: darkMode ? Colors.primary : Colors.primaryDark,
        tabBarInactiveTintColor: darkMode ? Colors.gray500 : Colors.gray600,
        tabBarStyle: {
          borderTopColor: darkMode ? Colors.gray900 : Colors.gray200,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 80 : 64,
          backgroundColor: darkMode ? '#111827' : Colors.white,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Fonts.bold,
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Carte"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Boutiques"
        component={ShopListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="storefront" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={AiAssistantScreen}
        options={{
          tabBarIcon: () => null,
          tabBarLabel: 'Assistant',
          tabBarButton: (props) => <AssistantButton {...props} />,
        }}
      />
      <Tab.Screen
        name="Panier"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="basket" size={size} color={color} />,
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarAccessibilityLabel: cartCount > 0 ? `Panier, ${cartCount} article${cartCount > 1 ? 's' : ''}` : 'Panier',
        }}
      />
      <Tab.Screen
        name="Profil"
        component={UserProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} />,
          // La messagerie est accessible depuis le profil : le badge des non-lus s'y affiche
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarAccessibilityLabel: unreadCount > 0
            ? `Profil, ${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`
            : 'Profil',
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  assistantButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
})
