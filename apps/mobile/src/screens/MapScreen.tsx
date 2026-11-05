import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Keyboard, Platform, Alert,
} from 'react-native'
import MapView, { Marker, Callout, Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, MIN_TOUCH_TARGET, Spacing, Radius, Fonts } from '../theme'
import { api } from '../services/api'
import { CATEGORY_LABELS, type Producer } from '../types/catalog'
import { IconButton } from '../components/IconButton'
import { ProductImage } from '../components/ProductImage'

type Nav = StackNavigationProp<RootStackParamList>

const ALL_CATEGORIES = 'Tous'
/** Le filtre porte sur Producer.categories (libellés français) : /producers n'a pas de paramètre de catégorie. */
const CATEGORIES = [ALL_CATEGORIES, ...Object.values(CATEGORY_LABELS)]
/** Rayon maximal accepté par GET /producers (specs/api/producers-api.yaml). */
const MAX_RADIUS_KM = 500
const KM_PER_DEGREE = 111

type LocatedProducer = Producer & { latitude: number; longitude: number }
const isLocated = (p: Producer): p is LocatedProducer => p.latitude != null && p.longitude != null

const DEFAULT_REGION = {
  latitude: 43.6,
  longitude: 3.88,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
}

export function MapScreen() {
  const nav = useNavigation<Nav>()
  const [producers, setProducers] = useState<LocatedProducer[]>([])
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES)
  const [showFilters, setShowFilters] = useState(false)
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const mapRef = useRef<MapView>(null)

  const isValidLocation = (lat: number, lng: number) => lat > 40 && lat < 52 && lng > -6 && lng < 10

  const fetchProducers = useCallback(async (searchQuery?: string) => {
    const radius = Math.min(MAX_RADIUS_KM, Math.max(region.latitudeDelta, region.longitudeDelta) * KM_PER_DEGREE)
    try {
      const res = await api.get<Producer[]>('/producers', {
        params: {
          lat: region.latitude,
          lon: region.longitude,
          radius,
          limit: 50,
          ...(searchQuery?.trim() ? { search: searchQuery.trim() } : {}),
        },
      })
      setProducers(res.data.filter(isLocated))
    } catch {
      // Requête refusée ou réseau coupé pendant un déplacement : on garde les producteurs déjà affichés
    }
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta])

  // Sans autorisation ou hors zone couverte, la carte reste centrée sur la région par défaut
  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const { latitude, longitude } = pos.coords
        if (!isValidLocation(latitude, longitude)) return
        const r: Region = { latitude, longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
        setRegion(r)
        mapRef.current?.animateToRegion(r, 800)
      } catch {
        // Position indisponible (GPS coupé…) : la région par défaut convient
      }
    })()
  }, [])

  // Recharge à chaque déplacement de la carte ; le texte recherché n'est relancé qu'à la validation
  useEffect(() => { void fetchProducers(search) }, [fetchProducers])

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion)
  }

  const handleSearchSubmit = () => {
    void fetchProducers(search)
  }

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    setShowFilters(false)
  }

  const visibleProducers = activeCategory === ALL_CATEGORIES
    ? producers
    : producers.filter((p) => p.categories?.includes(activeCategory))

  const searchResults = search.trim()
    ? visibleProducers.filter(
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
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Localisation refusée', 'Autorisez la localisation dans les réglages pour centrer la carte sur votre position.')
      return
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .catch(() => null)
    if (!pos) {
      Alert.alert('Position indisponible', 'Impossible de déterminer votre position pour le moment.')
      return
    }
    const { latitude, longitude } = pos.coords
    if (!isValidLocation(latitude, longitude)) {
      mapRef.current?.animateToRegion(DEFAULT_REGION, 800)
      return
    }
    const r: Region = { latitude, longitude, latitudeDelta: 0.5, longitudeDelta: 0.5 }
    mapRef.current?.animateToRegion(r, 800)
  }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={DEFAULT_REGION} onRegionChangeComplete={handleRegionChangeComplete}>
        {visibleProducers.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.latitude, longitude: p.longitude }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerCircle}>
                <MaterialCommunityIcons name="store" size={20} color={Colors.white} />
              </View>
              <View style={styles.markerDistance}>
                <Text style={styles.markerDistanceText}>{p.distance_km != null ? `${Math.round(p.distance_km)} km` : p.city}</Text>
              </View>
            </View>
            <Callout tooltip onPress={() => goToProducer(p.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{p.company_name}</Text>
                {p.description && <Text style={styles.calloutTagline}>{p.description}</Text>}
                <Text style={styles.calloutCta}>Voir la boutique →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={22} color={Colors.gray600} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un producteur…"
          placeholderTextColor={Colors.gray600}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          accessibilityLabel="Rechercher un producteur"
        />
        <IconButton
          icon="tune"
          label="Filtrer par catégorie"
          selected={showFilters}
          onPress={() => setShowFilters(!showFilters)}
          color={showFilters ? Colors.white : Colors.gray700}
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
        />
      </View>

      {searchFocused && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {searchResults.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.searchResultItem}
                onPress={() => goToProducer(p.id)}
                accessibilityRole="button"
              >
                <ProductImage uri={p.banner_url} style={styles.searchResultAvatar} iconSize={18} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{p.company_name}</Text>
                  {p.description && <Text style={styles.searchResultTagline}>{p.description}</Text>}
                </View>
                <Text style={styles.searchResultDistance}>{p.distance_km != null ? `${Math.round(p.distance_km)} km` : p.city}</Text>
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
                onPress={() => handleCategoryChange(cat)}
                style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: activeCategory === cat }}
              >
                <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <IconButton
        icon="crosshairs-gps"
        label="Centrer la carte sur ma position"
        onPress={() => void centerOnUser()}
        color={Colors.white}
        size={24}
        style={styles.locationBtn}
      />

      <View style={styles.bottomCards}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomCardsContent}>
          {visibleProducers.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.card}
              onPress={() => goToProducer(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`${p.company_name}${p.distance_km != null ? `, à ${Math.round(p.distance_km)} kilomètres` : ''}`}
            >
              <ProductImage uri={p.banner_url} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{p.company_name}</Text>
                {p.description && <Text style={styles.cardTagline} numberOfLines={1}>{p.description}</Text>}
                <View style={styles.cardMeta}>
                  {p.is_verified && (
                    <View style={styles.cardRating}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.primary} />
                      <Text style={styles.cardRatingText}>Vérifié</Text>
                    </View>
                  )}
                  {p.distance_km != null && (
                    <Text style={styles.cardDistance}>{Math.round(p.distance_km)} km</Text>
                  )}
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
    fontFamily: Fonts.regular,
    color: Colors.dark,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  filterBtn: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primaryDark,
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
  searchResultName: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.dark },
  searchResultTagline: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: 1 },
  searchResultDistance: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.primaryDark, marginLeft: Spacing.sm },
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
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryDark,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
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
    fontFamily: Fonts.bold,
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
  calloutName: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.dark },
  calloutTagline: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: 2 },
  calloutCta: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.primaryDark, marginTop: Spacing.sm },
  locationBtn: {
    position: 'absolute',
    bottom: 180,
    right: Spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryDark,
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
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  cardTagline: {
    fontSize: 12,
    fontFamily: Fonts.regular,
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
    fontFamily: Fonts.bold,
    color: Colors.dark,
  },
  cardDistance: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.primaryDark,
  },
})
