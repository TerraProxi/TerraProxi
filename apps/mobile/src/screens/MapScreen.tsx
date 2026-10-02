import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, Keyboard, Platform, ActivityIndicator, Alert,
} from 'react-native'
import MapView, { Marker, Callout, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import { api } from '../services/api'
import { useUiStore } from '../store/ui.store'

type Nav = StackNavigationProp<RootStackParamList>

interface Producer {
  id: string
  user_id: string
  company_name: string
  description: string | null
  address: string
  city: string
  postal_code: string
  latitude: number
  longitude: number
  website_url: string | null
  banner_url: string | null
  is_verified: boolean
  first_name: string
  last_name: string
  distance_km: number
  rating: number
  review_count: number
  categories: string[]
  is_open: boolean
}

const CATEGORIES = ['Tous', 'Légumes', 'Fruits', 'Vins', 'Épicerie', 'Viande', 'Fromage']

const DEFAULT_REGION = {
  latitude: 43.6,
  longitude: 3.88,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
}

export function MapScreen() {
  const nav = useNavigation<Nav>()
  const isDarkMode = useUiStore((s) => s.isDarkMode)
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [showFilters, setShowFilters] = useState(false)
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 43.610769,
    longitude: 3.876716,
  })
  const [locating, setLocating] = useState(false)
  const mapRef = useRef<MapView>(null)

  const isValidLocation = (lat: number, lng: number) => lat > 40 && lat < 52 && lng > -6 && lng < 10

  const fetchProducers = useCallback(async (searchQuery?: string, category?: string) => {
    try {
      setLoading(true)
      const params: Record<string, any> = {
        lat: region.latitude,
        lon: region.longitude,
        radius: Math.max(region.latitudeDelta, region.longitudeDelta) * 111,
        limit: 50,
      }
      if (searchQuery?.trim()) {
        params.search = searchQuery.trim()
      }
      if (category && category !== 'Tous') {
        params.category = category.toLowerCase()
      }
      const res = await api.get<Producer[]>('/producers', { params })
      setProducers(res.data)
    } catch {
      setProducers([])
    } finally {
      setLoading(false)
    }
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta])

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          try {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            const { latitude, longitude } = pos.coords
            if (isValidLocation(latitude, longitude)) {
              setUserCoord({ latitude, longitude })
              const r: Region = { latitude, longitude, latitudeDelta: 0.15, longitudeDelta: 0.15 }
              setRegion(r)
              mapRef.current?.animateToRegion(r, 800)
              return
            }
          } catch {}
        }
      } catch {}
      fetchProducers()
    })()
  }, [])

  useEffect(() => {
    fetchProducers(search, activeCategory)
  }, [region, activeCategory])

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion)
  }

  const handleSearchSubmit = () => {
    fetchProducers(search, activeCategory)
  }

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setShowFilters(false)
  }

  const handleZoomIn = () => {
    const newRegion: Region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: Math.max(region.latitudeDelta / 2, 0.005),
      longitudeDelta: Math.max(region.longitudeDelta / 2, 0.005),
    }
    setRegion(newRegion)
    mapRef.current?.animateToRegion(newRegion, 300)
  }

  const handleZoomOut = () => {
    const newRegion: Region = {
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 8.0),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 8.0),
    }
    setRegion(newRegion)
    mapRef.current?.animateToRegion(newRegion, 300)
  }

  const displayedProducers = producers.filter((p) => {
    if (activeCategory === 'Tous') return true
    if (!p.categories || !Array.isArray(p.categories)) return false
    return p.categories.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()))
  })

  const searchResults = search.trim()
    ? producers.filter(
        (p) =>
          p.company_name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
      )
    : []

  const goToProducer = (id: string) => {
    Keyboard.dismiss()
    setSearchFocused(false)
    nav.navigate('ProducerProfile', { producerId: id })
  }

  const centerOnUser = async () => {
    try {
      setLocating(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Localisation désactivée',
          'Veuillez autoriser l\'accès à votre position dans les réglages de votre appareil pour vous centrer.',
        )
        return
      }

      let lat = 43.610769
      let lon = 3.876716
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (pos?.coords && isValidLocation(pos.coords.latitude, pos.coords.longitude)) {
          lat = pos.coords.latitude
          lon = pos.coords.longitude
        }
      } catch {
        // Fallback to default coordinates
      }

      const targetCoord = { latitude: lat, longitude: lon }
      setUserCoord(targetCoord)

      const targetRegion: Region = {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
      setRegion(targetRegion)
      mapRef.current?.animateToRegion(targetRegion, 800)
    } catch {
      Alert.alert('Erreur', 'Impossible de déterminer votre localisation.')
    } finally {
      setLocating(false)
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {userCoord && (
          <Marker
            coordinate={userCoord}
            title="Votre position"
            description="Vous êtes ici"
            zIndex={999}
          >
            <View style={styles.userMarkerContainer}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerDot} />
            </View>
          </Marker>
        )}
        {displayedProducers.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerCircle}>
                <MaterialCommunityIcons name="store" size={20} color={Colors.white} />
              </View>
              <View style={styles.markerDistance}>
                <Text style={styles.markerDistanceText}>{Math.round(p.distance_km)} km</Text>
              </View>
            </View>
            <Callout tooltip onPress={() => goToProducer(p.id)}>
              <View style={[styles.callout, isDarkMode && { backgroundColor: '#1F2937' }]}>
                <Text style={[styles.calloutName, isDarkMode && { color: '#F9FAFB' }]}>{p.company_name}</Text>
                {p.description && (
                  <Text style={[styles.calloutTagline, isDarkMode && { color: '#9CA3AF' }]}>
                    {p.description}
                  </Text>
                )}
                <Text style={styles.calloutCta}>Voir la boutique →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.searchBar, isDarkMode && { backgroundColor: '#1F2937' }]}>
        <MaterialCommunityIcons name="magnify" size={22} color={isDarkMode ? '#9CA3AF' : Colors.gray500} />
        <TextInput
          style={[styles.searchInput, isDarkMode && { color: '#F9FAFB' }]}
          placeholder="Rechercher un producteur…"
          placeholderTextColor={isDarkMode ? '#6B7280' : Colors.gray400}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterBtn,
            isDarkMode && { backgroundColor: '#374151' },
            showFilters && styles.filterBtnActive,
          ]}
        >
          <MaterialCommunityIcons
            name="tune"
            size={22}
            color={showFilters ? Colors.white : isDarkMode ? '#E5E7EB' : Colors.gray700}
          />
        </TouchableOpacity>
      </View>

      {searchFocused && searchResults.length > 0 && (
        <View style={[styles.searchResults, isDarkMode && { backgroundColor: '#1F2937' }]}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {searchResults.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.searchResultItem, isDarkMode && { borderBottomColor: '#374151' }]}
                onPress={() => goToProducer(p.id)}
              >
                <Image source={{ uri: p.banner_url || undefined }} style={styles.searchResultAvatar} />
                <View style={styles.searchResultInfo}>
                  <Text style={[styles.searchResultName, isDarkMode && { color: '#F9FAFB' }]}>{p.company_name}</Text>
                  {p.description && (
                    <Text style={[styles.searchResultTagline, isDarkMode && { color: '#9CA3AF' }]}>
                      {p.description}
                    </Text>
                  )}
                </View>
                <Text style={styles.searchResultDistance}>{Math.round(p.distance_km)} km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showFilters && (
        <View style={[styles.filterPanel, isDarkMode && { backgroundColor: '#1F2937' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCategoryChange(cat)}
                style={[
                  styles.filterChip,
                  isDarkMode && { backgroundColor: '#374151' },
                  activeCategory === cat && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isDarkMode && { color: '#D1D5DB' },
                    activeCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View
        style={[
          styles.actionDock,
          { top: showFilters ? (Platform.OS === 'ios' ? 172 : 140) : (Platform.OS === 'ios' ? 116 : 84) },
          isDarkMode && { backgroundColor: '#1F2937' },
        ]}
      >
        <TouchableOpacity
          style={styles.actionDockBtn}
          onPress={handleZoomIn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color={isDarkMode ? '#F9FAFB' : Colors.dark} />
        </TouchableOpacity>

        <View style={[styles.actionDockDivider, isDarkMode && { backgroundColor: '#374151' }]} />

        <TouchableOpacity
          style={styles.actionDockBtn}
          onPress={handleZoomOut}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="minus" size={20} color={isDarkMode ? '#F9FAFB' : Colors.dark} />
        </TouchableOpacity>

        <View style={[styles.actionDockDivider, isDarkMode && { backgroundColor: '#374151' }]} />

        <TouchableOpacity
          style={styles.actionDockBtn}
          onPress={centerOnUser}
          activeOpacity={0.7}
        >
          {locating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomCards}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomCardsContent}>
          {displayedProducers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.card, isDarkMode && { backgroundColor: '#1F2937' }]}
              onPress={() => goToProducer(p.id)}
            >
              <Image source={{ uri: p.banner_url || undefined }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardName, isDarkMode && { color: '#F9FAFB' }]} numberOfLines={1}>{p.company_name}</Text>
                {p.description && (
                  <Text style={[styles.cardTagline, isDarkMode && { color: '#9CA3AF' }]} numberOfLines={1}>
                    {p.description}
                  </Text>
                )}
                <View style={styles.cardMeta}>
                  <View style={styles.cardRating}>
                    <MaterialCommunityIcons name="star" size={14} color={Colors.yellow500} />
                    <Text style={styles.cardRatingText}>{p.rating}</Text>
                  </View>
                  <Text style={styles.cardDistance}>{Math.round(p.distance_km)} km</Text>
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
  actionDock: {
    position: 'absolute',
    right: Spacing.lg,
    width: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 25,
    overflow: 'hidden',
  },
  actionDockBtn: {
    width: 44,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDockDivider: {
    width: 26,
    height: 1,
    backgroundColor: Colors.gray200,
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
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(91, 174, 106, 0.3)',
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
})
