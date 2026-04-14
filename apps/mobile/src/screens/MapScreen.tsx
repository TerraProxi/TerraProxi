import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, SafeAreaView,
} from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'

interface Producer {
  id: string
  company_name: string
  city?: string
  latitude?: number
  longitude?: number
  distance_km?: number
}

type Nav = StackNavigationProp<RootStackParamList>

const COLORS = { primary: '#76CCD6', secondary: '#5BAE6A', dark: '#333', muted: '#9CA3AF', white: '#fff', border: '#E2EEE2' }

export function MapScreen() {
  const nav = useNavigation<Nav>()
  const [producers, setProducers] = useState<Producer[]>([])
  const [region, setRegion] = useState({ latitude: 46.6, longitude: 1.9, latitudeDelta: 8, longitudeDelta: 8 })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [radius, setRadius] = useState(30)

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const { latitude, longitude } = pos.coords
    setRegion({ latitude, longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 })
    load(latitude, longitude)
  }

  const load = async (lat?: number, lon?: number) => {
    setLoading(true)
    try {
      const { data } = await api.get<Producer[]>('/producers', {
        params: { lat, lon, radius, search: search || undefined, limit: 30 },
      })
      setProducers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapView style={styles.map} region={region} onRegionChangeComplete={setRegion}>
        {producers.map((p) =>
          p.latitude && p.longitude ? (
            <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }}>
              <Callout onPress={() => nav.navigate('ProducerProfile', { producerId: p.id })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{p.company_name}</Text>
                  {p.city && <Text style={styles.calloutSub}>📍 {p.city}</Text>}
                  <Text style={{ color: COLORS.primary, fontWeight: '700', marginTop: 4 }}>Voir la boutique →</Text>
                </View>
              </Callout>
            </Marker>
          ) : null,
        )}
      </MapView>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <TextInput
          placeholder="Rechercher un producteur…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(region.latitude, region.longitude)}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={locate} style={styles.locateBtn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Liste en bas */}
      {loading ? (
        <View style={styles.listContainer}>
          <ActivityIndicator color={COLORS.secondary} />
        </View>
      ) : (
        <FlatList
          horizontal
          data={producers}
          keyExtractor={(p) => p.id}
          style={styles.listContainer}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => nav.navigate('ProducerProfile', { producerId: item.id })}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{item.company_name}</Text>
              {item.city && <Text style={styles.cardSub}>📍 {item.city}</Text>}
              {item.distance_km !== undefined && (
                <Text style={{ fontSize: 12, color: COLORS.primary, marginTop: 2 }}>
                  {item.distance_km.toFixed(1)} km
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  map:          { flex: 1 },
  searchBar:    { position: 'absolute', top: 16, left: 12, right: 12, flexDirection: 'row', gap: 8, zIndex: 10 },
  searchInput:  { flex: 1, background: '#fff', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  locateBtn:    { backgroundColor: '#5BAE6A', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  listContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(255,255,255,0.95)', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2EEE2' },
  card:          { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2EEE2', minWidth: 160 },
  cardTitle:     { fontWeight: '700', fontSize: 14, color: '#333' },
  cardSub:       { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  callout:       { padding: 8, minWidth: 150 },
  calloutTitle:  { fontWeight: '700', fontSize: 14 },
  calloutSub:    { fontSize: 12, color: '#666', marginTop: 2 },
})
