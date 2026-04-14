import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { MapScreen } from '../screens/MapScreen'
import { ShopListScreen } from '../screens/ShopListScreen'
import { ScanScreen } from '../screens/ScanScreen'
import { FavoritesScreen } from '../screens/FavoritesScreen'
import { UserProfileScreen } from '../screens/UserProfileScreen'
import { Colors } from '../theme'
import { useUiStore } from '../store/ui.store'

const Tab = createBottomTabNavigator()

function ScanButton({ onPress }: { onPress: (e: any) => void }) {
  return (
    <TouchableOpacity style={styles.scanButton} onPress={(e) => onPress(e)} activeOpacity={0.7}>
      <View style={styles.scanButtonInner}>
        <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  )
}

export function TabNavigator() {
  const darkMode = useUiStore((s) => s.darkMode)

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: darkMode ? '#9CA3AF' : Colors.gray500,
        tabBarStyle: {
          borderTopColor: darkMode ? '#1F2937' : Colors.gray200,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 80 : 64,
          backgroundColor: darkMode ? '#111827' : '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Carte"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Boutiques"
        component={ShopListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <ScanButton onPress={props.onPress!} />
          ),
        }}
      />
      <Tab.Screen
        name="Favoris"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={UserProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  scanButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
})
