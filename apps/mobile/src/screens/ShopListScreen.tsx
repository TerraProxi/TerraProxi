import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Image,
  StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { Colors, Spacing, Radius } from '../theme'
import { api } from '../services/api'

type Filter = 'closest' | 'rated' | 'open'

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

const FILTERS: { key: Filter; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { key: 'closest', label: 'Plus proche', icon: 'map-marker' },
  { key: 'rated', label: 'Mieux notés', icon: 'star' },
  { key: 'open', label: 'Ouvert', icon: 'store' },
]

export function ShopListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('closest')
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)

  const fetchProducers = async (searchQuery?: string) => {
    try {
      setLoading(true)
      const params: Record<string, any> = { limit: 20 }
      if (userLocation) {
        params.lat = userLocation.lat
        params.lon = userLocation.lon
        params.radius = 100
      }
      if (searchQuery?.trim()) {
        params.search = searchQuery.trim()
      }
      console.log('[ShopList] fetching producers with params:', JSON.stringify(params))
      const res = await api.get<Producer[]>('/producers', { params })
      console.log('[ShopList] response:', res.data?.length, 'producers')
      setProducers(res.data)
    } catch (err: any) {
      console.error('[ShopList] fetch error:', err?.message, err?.code, err?.response?.status)
      setProducers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          const { latitude, longitude } = pos.coords
          if (latitude > 40 && latitude < 52 && longitude > -6 && longitude < 10) {
            setUserLocation({ lat: latitude, lon: longitude })
          }
        }
      } catch {}
      fetchProducers()
    })()
  }, [])

  const handleSearchSubmit = () => {
    fetchProducers(search)
  }

  const handleFilterChange = (filter: Filter) => {
    setActiveFilter(filter)
    if (filter === 'closest' && userLocation) {
      fetchProducers(search)
    }
  }

  const filtered = useMemo(() => {
    let result = [...producers]
    switch (activeFilter) {
      case 'closest':
        result.sort((a, b) => a.distance_km - b.distance_km)
        break
      case 'rated':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'open':
        result = result.filter((p) => p.is_open)
        break
    }
    return result
  }, [producers, activeFilter])

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.headerTitle}>Producteurs Locaux</Text>
        <Text style={styles.headerSubtitle}>En direct du terroir héraultais</Text>
      </View>

      <View style={styles.searchWrapper}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un producteur…"
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => handleFilterChange(f.key)}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <MaterialCommunityIcons
                  name={f.icon}
                  size={14}
                  color={active ? Colors.white : Colors.primary}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="store-off" size={48} color={Colors.gray300} />
          <Text style={styles.emptyTitle}>Aucun producteur trouvé</Text>
          <Text style={styles.emptySubtitle}>
            {producers.length === 0 ? 'Vérifiez que l\'API est lancée sur localhost:3002' : 'Essayez un autre filtre'}
          </Text>
          <TouchableOpacity onPress={() => fetchProducers(search)} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ProducerProfile', { producerId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.imageWrapper}>
                <Image source={{ uri: item.banner_url || undefined }} style={styles.image} />
                <View style={[styles.badge, item.is_open ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={styles.badgeText}>{item.is_open ? 'OUVERT' : 'FERMÉ'}</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.producerName} numberOfLines={1}>{item.company_name}</Text>
                {item.description ? (
                  <Text style={styles.producerTagline} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View style={styles.cardBottom}>
                  <View style={styles.distanceBadge}>
                    <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
                    <Text style={styles.distanceText}>{item.distance_km} km</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.gray400}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
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
    fontWeight: '800',
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.gray600,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.gray900,
  },
  filterRow: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  filterContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    flexShrink: 0,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  separator: {
    height: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: Radius.lg,
  },
  badge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeOpen: {
    backgroundColor: Colors.primary,
  },
  badgeClosed: {
    backgroundColor: Colors.danger,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
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
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  producerTagline: {
    fontSize: 13,
    color: Colors.gray600,
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
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 3,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray700,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
})
