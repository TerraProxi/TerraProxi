import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Fonts, MIN_TOUCH_TARGET, Spacing, Radius } from '../theme'
import { api, apiErrorMessage } from '../services/api'
import type { Producer } from '../types/catalog'
import type { IconName } from '../components/IconButton'
import { ProductImage } from '../components/ProductImage'
import { MessageState } from '../components/ScreenState'
import { RecommendationsCarousel } from '../components/RecommendationsCarousel'

type Nav = StackNavigationProp<RootStackParamList>
type Filter = 'closest' | 'verified' | 'name'
type Coordinates = { lat: number; lon: number }

const FILTERS: { key: Filter; label: string; icon: IconName }[] = [
  { key: 'closest', label: 'Plus proche', icon: 'map-marker' },
  { key: 'verified', label: 'Vérifiés', icon: 'check-decagram' },
  { key: 'name', label: 'A → Z', icon: 'sort-alphabetical-ascending' },
]

const SEARCH_RADIUS_KM = 100
const PAGE_SIZE = 20

const isInCoveredArea = ({ lat, lon }: Coordinates) => lat > 40 && lat < 52 && lon > -6 && lon < 10

async function locateUser(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
    return isInCoveredArea(coords) ? coords : null
  } catch {
    // Position indisponible : la liste est alors triée par date d'inscription
    return null
  }
}

export function ShopListScreen() {
  const nav = useNavigation<Nav>()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('closest')
  const [producers, setProducers] = useState<Producer[]>([])
  const [isLoading, setLoading] = useState(true)
  const [isRefreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)

  const fetchProducers = useCallback(async (location: Coordinates | null, searchQuery: string) => {
    try {
      const { data } = await api.get<Producer[]>('/producers', {
        params: {
          limit: PAGE_SIZE,
          ...(location ? { lat: location.lat, lon: location.lon, radius: SEARCH_RADIUS_KM } : {}),
          ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        },
      })
      setProducers(data)
      setError(null)
    } catch (err) {
      setError(apiErrorMessage(err, 'Impossible de charger les producteurs'))
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const location = await locateUser()
      setUserLocation(location)
      await fetchProducers(location, '')
      setLoading(false)
    })()
  }, [fetchProducers])

  const refresh = async () => {
    setRefreshing(true)
    await fetchProducers(userLocation, search)
    setRefreshing(false)
  }

  const retry = async () => {
    setLoading(true)
    await fetchProducers(userLocation, search)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'closest':
        return [...producers].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
      case 'verified':
        return producers.filter((p) => p.is_verified)
      case 'name':
        return [...producers].sort((a, b) => a.company_name.localeCompare(b.company_name, 'fr'))
    }
  }, [producers, activeFilter])

  const header = (
    <>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.headerTitle} accessibilityRole="header">Producteurs locaux</Text>
        <Text style={styles.headerSubtitle}>En direct du terroir héraultais</Text>
      </View>
      <RecommendationsCarousel onOpenProduct={(productId) => nav.navigate('ProductDetail', { productId })} />
      <View style={styles.searchWrapper}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.gray600} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un producteur…"
          placeholderTextColor={Colors.gray600}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void retry()}
          returnKeyType="search"
          accessibilityLabel="Rechercher un producteur"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <MaterialCommunityIcons name={f.icon} size={14} color={isActive ? Colors.white : Colors.primaryDark} />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </>
  )

  return (
    <FlatList
      style={styles.container}
      data={isLoading ? [] : filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
      ListEmptyComponent={isLoading ? (
        <ActivityIndicator size="large" color={Colors.primaryDark} style={styles.loader} accessibilityLabel="Chargement" />
      ) : (
        <MessageState
          icon="store-off"
          title={error ? 'Producteurs indisponibles' : 'Aucun producteur trouvé'}
          message={error ?? 'Essayez une autre recherche ou un autre filtre.'}
          actionLabel="Réessayer"
          onAction={() => void retry()}
        />
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => nav.navigate('ProducerProfile', { producerId: item.id })}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={[
            item.company_name,
            item.is_verified ? 'producteur vérifié' : null,
            item.distance_km != null ? `à ${item.distance_km.toFixed(1)} kilomètres` : null,
          ].filter(Boolean).join(', ')}
        >
          <View style={styles.imageWrapper}>
            <ProductImage uri={item.banner_url} style={styles.image} />
            {item.is_verified && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>VÉRIFIÉ</Text>
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.producerName} numberOfLines={1}>{item.company_name}</Text>
            {item.description ? (
              <Text style={styles.producerTagline} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <View style={styles.cardBottom}>
              <View style={styles.distanceBadge}>
                <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primaryDark} />
                <Text style={styles.distanceText}>
                  {item.distance_km != null ? `${item.distance_km.toFixed(1)} km` : item.city ?? '—'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.gray600} />
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: Fonts.titleHeavy,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.gray700,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 3,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.gray900,
    paddingVertical: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  filterPillActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.primaryDark,
    marginLeft: Spacing.xs,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    elevation: 2,
  },
  imageWrapper: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: 96,
    height: 96,
  },
  badge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryDark,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.heavy,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
  },
  producerName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  producerTagline: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.gray700,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.primaryDark,
    marginLeft: 3,
  },
})
