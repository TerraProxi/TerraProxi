import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { MapScreen }     from '../screens/MapScreen'
import { ProductsScreen } from '../screens/ProductsScreen'
import { CartScreen }    from '../screens/CartScreen'
import { OrdersScreen }  from '../screens/OrdersScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { useCartStore }  from '../store/cart.store'

const Tab = createBottomTabNavigator()

const COLORS = {
  primary:   '#76CCD6',
  secondary: '#5BAE6A',
  dark:      '#333333',
  muted:     '#9CA3AF',
}

export function TabNavigator() {
  const count = useCartStore((s) => s.count)

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          borderTopColor: '#E2EEE2',
          paddingBottom: 4,
          height: 60,
        },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: COLORS.dark },
      }}
    >
      <Tab.Screen
        name="Carte"
        component={MapScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text> }}
      />
      <Tab.Screen
        name="Produits"
        component={ProductsScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛍️</Text> }}
      />
      <Tab.Screen
        name="Panier"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛒</Text>,
          tabBarBadge: count > 0 ? count : undefined,
        }}
      />
      <Tab.Screen
        name="Commandes"
        component={OrdersScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text> }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  )
}
