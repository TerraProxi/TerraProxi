import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Image,
  StyleSheet, ScrollView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors, Spacing, Radius } from '../theme'
import { useMockStore } from '../store/mock.store'

type Filter = 'closest' | 'rated' | 'open'

const FILTERS: { key: Filter; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }[] = [
  { key: 'closest', label: 'Plus proche', icon: 'map-marker' },
  { key: 'rated', label: 'Mieux notés', icon: 'star' },
  { key: 'open', label: 'Ouvert', icon: 'store' },
]

export function ShopListScreen({ navigation }: any) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('closest')
  const producers = useMockStore((s) => s.producers)

  const filtered = useMemo(() => {
    let result = [...producers]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q),
      )
    }
    switch (activeFilter) {
      case 'closest':
        result.sort((a, b) => a.distance - b.distance)
        break
      case 'rated':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'open':
        result = result.filter((p) => p.isOpen)
        break
    }
    return result
  }, [producers, search, activeFilter])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.key
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <MaterialCommunityIcons
                name={f.icon}
                size={16}
                color={active ? Colors.white : Colors.primary}
              />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

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
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={[styles.badge, item.isOpen ? styles.badgeOpen : styles.badgeClosed]}>
                <Text style={styles.badgeText}>{item.isOpen ? 'OUVERT' : 'FERMÉ'}</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.producerName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.producerTagline} numberOfLines={2}>{item.tagline}</Text>
              <View style={styles.cardBottom}>
                <View style={styles.distanceBadge}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={Colors.primary} />
                  <Text style={styles.distanceText}>{item.distance} km</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
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
    marginTop: -Spacing.lg,
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
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    marginRight: Spacing.sm,
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
})
