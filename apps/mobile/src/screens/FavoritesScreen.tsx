import { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Colors, Spacing, Radius } from '../theme'
import { api } from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'
import { useCartStore } from '../store/cart.store'

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
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id ?? '',
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Coups de Cœur</Text>
        <Text style={styles.headerSubtitle}>
          Retrouvez vos produits et artisans préférés
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, tab === 'producers' && styles.tabActive]}
            onPress={() => setTab('producers')}
          >
            <Text style={[styles.tabText, tab === 'producers' && styles.tabTextActive]}>
              Producteurs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'products' && styles.tabActive]}
            onPress={() => setTab('products')}
          >
            <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>
              Produits
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'producers' ? (
        favoriteProducers.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="heart-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>Aucun producteur favori</Text>
          </View>
        ) : (
          <View style={styles.producerList}>
            {favoriteProducers.map((producer) => (
              <TouchableOpacity
                key={producer.id}
                style={styles.producerCard}
                onPress={() => navigation.navigate('ProducerProfile', { producerId: producer.id })}
                activeOpacity={0.7}
              >
                <Image source={{ uri: producer.avatar_url || producer.banner_url }} style={styles.producerAvatar} />
                <View style={styles.producerInfo}>
                  <Text style={styles.producerName} numberOfLines={1}>{producer.company_name}</Text>
                  <Text style={styles.producerTagline} numberOfLines={1}>{producer.tagline}</Text>
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
          <MaterialCommunityIcons name="heart-outline" size={48} color={Colors.gray300} />
          <Text style={styles.emptyText}>Aucun produit favori</Text>
        </View>
      ) : (
        <View style={styles.productGrid}>
          {favoriteProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
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
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productUnit}>{product.unit}</Text>
                <View style={styles.productBottom}>
                  <Text style={styles.productPrice}>
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
            </View>
          ))}
        </View>
      )}

      <View style={styles.inspirationSection}>
        <View style={styles.inspirationCard}>
          <View style={styles.inspirationCardGradient} />
          <Text style={styles.inspirationEmoji}>🍅</Text>
          <View style={styles.inspirationContent}>
            <Text style={styles.inspirationTitle}>Inspiration de saison</Text>
            <Text style={styles.inspirationText}>
              Découvrez les produits de printemps sélectionnés pour vous
            </Text>
          </View>
          <TouchableOpacity style={styles.inspirationBtn}>
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
