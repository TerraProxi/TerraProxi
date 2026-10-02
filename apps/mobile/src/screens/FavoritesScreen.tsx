import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  StyleSheet, Dimensions, ActivityIndicator, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Colors, Spacing, Radius } from '../theme'
import { api } from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'
import { useCartStore } from '../store/cart.store'
import { useUiStore } from '../store/ui.store'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - Spacing.xl * 3) / 2

interface ApiProducer {
  id: string
  company_name: string
  tagline?: string
  banner_url?: string
  avatar_url?: string
}

interface ApiProduct {
  id: string
  name: string
  price: number
  unit: string
  banner_url?: string
  image_url?: string
  producer_id?: string
}

type Tab = 'producers' | 'products'

export function FavoritesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets()
  const isDarkMode = useUiStore((s) => s.isDarkMode)
  const [tab, setTab] = useState<Tab>('producers')
  const [allProducers, setAllProducers] = useState<ApiProducer[]>([])
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)

  const producerIds = useFavoritesStore((s) => s.producerIds)
  const productIds = useFavoritesStore((s) => s.productIds)
  const toggleProducer = useFavoritesStore((s) => s.toggleProducer)
  const toggleProduct = useFavoritesStore((s) => s.toggleProduct)
  const addToCart = useCartStore((s) => s.add)

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, pRes] = await Promise.all([
          api.get<ApiProducer[]>('/producers', { params: { limit: 50 } }),
          api.get<ApiProduct[]>('/products', { params: { limit: 50 } }),
        ])
        setAllProducers(prodRes.data)
        setAllProducts(pRes.data)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const favoriteProducers = allProducers.filter((p) => producerIds.includes(p.id))
  const favoriteProducts = allProducts.filter((p) => productIds.includes(p.id))

  const handleAddToCart = (product: ApiProduct) => {
    const producer = allProducers.find((p) => p.id === product.producer_id)
    const result = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id ?? '',
      producer_name: producer?.company_name ?? 'Producteur local',
      image_url: product.image_url ?? product.banner_url,
    })

    Alert.alert(
      '✓ Ajouté',
      result === 'updated'
        ? `${product.name} — quantité mise à jour`
        : `${product.name} ajouté au panier`,
    )
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && { backgroundColor: '#111827' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode && { backgroundColor: '#111827' }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }, isDarkMode && { backgroundColor: '#064E3B' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={isDarkMode ? '#FFFFFF' : Colors.gray900} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, isDarkMode && { color: '#FFFFFF', marginBottom: 0 }]}>
            Mes Coups de Cœur
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, isDarkMode && { color: '#D1FAE5' }]}>
          Retrouvez vos produits et artisans préférés
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={[styles.tabBar, isDarkMode && { backgroundColor: '#1F2937' }]}>
          <TouchableOpacity
            style={[styles.tab, tab === 'producers' && styles.tabActive]}
            onPress={() => setTab('producers')}
          >
            <Text style={[styles.tabText, tab === 'producers' && styles.tabTextActive, isDarkMode && tab !== 'producers' && { color: '#9CA3AF' }]}>
              Producteurs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'products' && styles.tabActive]}
            onPress={() => setTab('products')}
          >
            <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive, isDarkMode && tab !== 'products' && { color: '#9CA3AF' }]}>
              Produits
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'producers' ? (
        favoriteProducers.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="heart-outline" size={48} color={isDarkMode ? '#4B5563' : Colors.gray300} />
            <Text style={[styles.emptyText, isDarkMode && { color: '#9CA3AF' }]}>Aucun producteur favori</Text>
          </View>
        ) : (
          <View style={styles.producerList}>
            {favoriteProducers.map((producer) => (
              <TouchableOpacity
                key={producer.id}
                style={[styles.producerCard, isDarkMode && { backgroundColor: '#1F2937' }]}
                onPress={() => navigation.navigate('ProducerProfile', { producerId: producer.id })}
                activeOpacity={0.7}
              >
                <Image source={{ uri: producer.avatar_url || producer.banner_url }} style={styles.producerAvatar} />
                <View style={styles.producerInfo}>
                  <Text style={[styles.producerName, isDarkMode && { color: '#F9FAFB' }]} numberOfLines={1}>{producer.company_name}</Text>
                  <Text style={[styles.producerTagline, isDarkMode && { color: '#9CA3AF' }]} numberOfLines={1}>{producer.tagline}</Text>
                  <View style={styles.producerBadges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Bio</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Local</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => toggleProducer(producer.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="heart"
                    size={24}
                    color={Colors.danger}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : favoriteProducts.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={48} color={isDarkMode ? '#4B5563' : Colors.gray300} />
          <Text style={[styles.emptyText, isDarkMode && { color: '#9CA3AF' }]}>Aucun produit favori</Text>
        </View>
      ) : (
        <View style={styles.productGrid}>
          {favoriteProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[styles.productCard, isDarkMode && { backgroundColor: '#1F2937' }]}
              onPress={() => {
                if (product.producer_id) {
                  navigation.navigate('Catalog', { producerId: product.producer_id })
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.productImageWrapper}>
                <Image source={{ uri: product.banner_url || product.image_url }} style={styles.productImage} />
                <TouchableOpacity
                  style={styles.productHeartBtn}
                  onPress={() => toggleProduct(product.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="heart" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, isDarkMode && { color: '#F9FAFB' }]} numberOfLines={1}>{product.name}</Text>
                <Text style={[styles.productUnit, isDarkMode && { color: '#9CA3AF' }]}>{product.unit}</Text>
                <View style={styles.productBottom}>
                  <Text style={[styles.productPrice, isDarkMode && { color: '#A7F3D0' }]}>
                    {product.price.toFixed(2)} €
                  </Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(product)}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inspirationSection}>
        <View style={[styles.inspirationCard, isDarkMode && { backgroundColor: '#1F2937' }]}>
          <View style={styles.inspirationCardGradient} />
          <Text style={styles.inspirationEmoji}>🍅</Text>
          <View style={styles.inspirationContent}>
            <Text style={[styles.inspirationTitle, isDarkMode && { color: '#F9FAFB' }]}>Inspiration de saison</Text>
            <Text style={[styles.inspirationText, isDarkMode && { color: '#9CA3AF' }]}>
              Découvrez les produits de saison sélectionnés pour vous
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inspirationBtn}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.inspirationBtnText}>Voir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
  },
  header: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xl,
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
  tabContainer: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray600,
  },
  tabTextActive: {
    color: Colors.gray900,
    fontWeight: '700',
  },
  producerList: {
    paddingHorizontal: Spacing.xl,
  },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  producerAvatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
  },
  producerInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  producerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 2,
  },
  producerTagline: {
    fontSize: 13,
    color: Colors.gray600,
    marginBottom: Spacing.sm,
  },
  producerBadges: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginRight: Spacing.xs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  productImageWrapper: {
    position: 'relative',
    height: 112,
  },
  productImage: {
    width: '100%',
    height: 112,
    resizeMode: 'cover',
  },
  productHeartBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 2,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: Spacing.sm,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.gray400,
    marginTop: Spacing.lg,
  },
  inspirationSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  inspirationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    overflow: 'hidden',
    backgroundColor: '#FFF7ED',
  },
  inspirationCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FEF2F2',
    opacity: 0.5,
  },
  inspirationEmoji: {
    fontSize: 36,
    marginRight: Spacing.lg,
  },
  inspirationContent: {
    flex: 1,
  },
  inspirationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  inspirationText: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
  },
  inspirationBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  inspirationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
})
