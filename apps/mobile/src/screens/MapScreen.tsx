import { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Keyboard, Platform,
} from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import { useMockStore } from '../store/mock.store'

type Nav = StackNavigationProp<RootStackParamList>

const CATEGORIES = ['Tous', 'Légumes', 'Fruits', 'Vins', 'Épicerie', 'Viande', 'Fromage']

const DEFAULT_REGION = {
  latitude: 43.6,
  longitude: 3.88,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
}

export function MapScreen() {
  const nav = useNavigation<Nav>()
  const { producers } = useMockStore()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [showFilters, setShowFilters] = useState(false)
  const [region, setRegion] = useState(DEFAULT_REGION)
  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const r = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
      setRegion(r)
      mapRef.current?.animateToRegion(r, 800)
    })()
  }, [])

  const filteredProducers = producers.filter((p) => {
    const matchesCategory = activeCategory === 'Tous' || p.categories.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()))
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.tagline.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const searchResults = search.trim()
    ? producers.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.tagline.toLowerCase().includes(search.toLowerCase()),
      )
    : []

  const goToProducer = (id: string) => {
    Keyboard.dismiss()
    setSearchFocused(false)
    nav.navigate('ProducerProfile', { producerId: id })
  }

  const centerOnUser = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const r = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    mapRef.current?.animateToRegion(r, 800)
  }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={DEFAULT_REGION} onRegionChangeComplete={setRegion}>
        {filteredProducers.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.coordinates.lat, longitude: p.coordinates.lng }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerCircle}>
                <MaterialCommunityIcons name="store" size={20} color={Colors.white} />
              </View>
              <View style={styles.markerDistance}>
                <Text style={styles.markerDistanceText}>{p.distance} km</Text>
              </View>
            </View>
            <Callout tooltip onPress={() => goToProducer(p.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{p.name}</Text>
                <Text style={styles.calloutTagline}>{p.tagline}</Text>
                <Text style={styles.calloutCta}>Voir la boutique →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={22} color={Colors.gray500} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un producteur…"
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
        >
          <MaterialCommunityIcons name="tune" size={22} color={showFilters ? Colors.white : Colors.gray700} />
        </TouchableOpacity>
      </View>

      {searchFocused && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {searchResults.map((p) => (
              <TouchableOpacity key={p.id} style={styles.searchResultItem} onPress={() => goToProducer(p.id)}>
                <Image source={{ uri: p.avatar }} style={styles.searchResultAvatar} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{p.name}</Text>
                  <Text style={styles.searchResultTagline}>{p.tagline}</Text>
                </View>
                <Text style={styles.searchResultDistance}>{p.distance} km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.locationBtn} onPress={centerOnUser}>
        <MaterialCommunityIcons name="crosshairs-gps" size={24} color={Colors.white} />
      </TouchableOpacity>

      <View style={styles.bottomCards}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomCardsContent}>
          {filteredProducers.map((p) => (
            <TouchableOpacity key={p.id} style={styles.card} onPress={() => goToProducer(p.id)}>
              <Image source={{ uri: p.image }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.cardTagline} numberOfLines={1}>{p.tagline}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.cardRating}>
                    <MaterialCommunityIcons name="star" size={14} color={Colors.yellow500} />
                    <Text style={styles.cardRatingText}>{p.rating}</Text>
                  </View>
                  <Text style={styles.cardDistance}>{p.distance} km</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  searchResults: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 106 : 74,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 15,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.md,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontWeight: '700', fontSize: 14, color: Colors.dark },
  searchResultTagline: { fontSize: 12, color: Colors.gray600, marginTop: 1 },
  searchResultDistance: { fontSize: 13, fontWeight: '600', color: Colors.primary, marginLeft: Spacing.sm },
  filterPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 106 : 74,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 15,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDistance: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  markerDistanceText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  callout: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutName: { fontWeight: '700', fontSize: 14, color: Colors.dark },
  calloutTagline: { fontSize: 12, color: Colors.gray600, marginTop: 2 },
  calloutCta: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: Spacing.sm },
  locationBtn: {
    position: 'absolute',
    bottom: 180,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  bottomCards: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomCardsContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    width: 200,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  cardBody: {
    padding: Spacing.md,
  },
  cardName: {
    fontWeight: '700',
    fontSize: 14,
    color: Colors.dark,
  },
  cardTagline: {
    fontSize: 12,
    color: Colors.gray600,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
  },
  cardDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
})
