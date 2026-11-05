import { useCallback, useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, RefreshControl,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Fonts, MIN_TOUCH_TARGET, Spacing, Radius } from '../theme'
import { api, apiErrorStatus } from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'
import { useCartStore } from '../store/cart.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import type { Product, Producer } from '../types/catalog'
import { IconButton } from '../components/IconButton'
import { ProductImage } from '../components/ProductImage'
import { LoadingState } from '../components/ScreenState'

type Props = StackScreenProps<RootStackParamList, 'Favorites'>
type Tab = 'producers' | 'products'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - Spacing.xl * 3) / 2
const HTTP_NOT_FOUND = 404

/**
 * Charge chaque favori par son identifiant. Un favori supprimé côté serveur (404) est
 * retiré de la liste locale ; les autres erreurs remontent pour afficher un message.
 */
async function fetchByIds<T>(ids: string[], path: string, forget: (id: string) => void): Promise<T[]> {
  const results = await Promise.allSettled(ids.map((id) => api.get<T>(`${path}/${id}`)))
  const items: T[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(result.value.data)
    else if (apiErrorStatus(result.reason) === HTTP_NOT_FOUND) forget(ids[index])
    else throw result.reason
  })
  return items
}

export function FavoritesScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('producers')
  const [producers, setProducers] = useState<Producer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const producerIds = useFavoritesStore((s) => s.producerIds)
  const productIds = useFavoritesStore((s) => s.productIds)
  const toggleProducer = useFavoritesStore((s) => s.toggleProducer)
  const toggleProduct = useFavoritesStore((s) => s.toggleProduct)
  const addToCart = useCartStore((s) => s.add)

  const load = useCallback(async () => {
    const [producerList, productList] = await Promise.all([
      fetchByIds<Producer>(producerIds, '/producers', toggleProducer),
      fetchByIds<Product>(productIds, '/products', toggleProduct),
    ])
    setProducers(producerList)
    setProducts(productList)
  }, [producerIds, productIds, toggleProducer, toggleProduct])
  const { isLoading, isRefreshing, error, refresh } = useFocusLoader(load, 'Impossible de charger vos favoris')

  // Affiche immédiatement le retrait d'un favori, sans attendre le prochain chargement
  const favoriteProducers = producers.filter((p) => producerIds.includes(p.id))
  const favoriteProducts = products.filter((p) => productIds.includes(p.id))

  const handleAddToCart = (product: Product) => {
    const result = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id,
      producer_name: product.producer_name,
      image_url: product.image_url ?? undefined,
    })
    Alert.alert('Panier', result === 'updated' ? `${product.name} : quantité mise à jour` : `${product.name} ajouté au panier`)
  }

  if (isLoading) return <LoadingState />

  const renderTab = (key: Tab, label: string) => {
    const isActive = tab === key
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setTab(key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  const renderEmpty = (label: string) => (
    <View style={styles.empty}>
      <MaterialCommunityIcons name="heart-outline" size={48} color={Colors.gray400} />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">Mes coups de cœur</Text>
        <Text style={styles.headerSubtitle}>Retrouvez vos produits et producteurs préférés</Text>
      </View>

      {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error} — tirez vers le bas pour réessayer.</Text>}

      <View style={styles.tabBar} accessibilityRole="tablist">
        {renderTab('producers', 'Producteurs')}
        {renderTab('products', 'Produits')}
      </View>

      {tab === 'producers' && (favoriteProducers.length === 0 ? renderEmpty('Aucun producteur favori') : (
        <View style={styles.producerList}>
          {favoriteProducers.map((producer) => (
            <View key={producer.id} style={styles.producerCard}>
              <TouchableOpacity
                style={styles.producerMain}
                onPress={() => navigation.navigate('ProducerProfile', { producerId: producer.id })}
                accessibilityRole="button"
                accessibilityLabel={`${producer.company_name}${producer.city ? `, ${producer.city}` : ''}`}
              >
                <ProductImage uri={producer.banner_url} style={styles.producerAvatar} iconSize={24} />
                <View style={styles.producerInfo}>
                  <Text style={styles.producerName} numberOfLines={1}>{producer.company_name}</Text>
                  {producer.city ? <Text style={styles.producerMeta} numberOfLines={1}>{producer.city}</Text> : null}
                  {producer.categories && producer.categories.length > 0 && (
                    <Text style={styles.producerMeta} numberOfLines={1}>{producer.categories.join(' · ')}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <IconButton
                icon="heart"
                label={`Retirer ${producer.company_name} des favoris`}
                selected
                onPress={() => toggleProducer(producer.id)}
                color={Colors.danger}
                size={24}
              />
            </View>
          ))}
        </View>
      ))}

      {tab === 'products' && (favoriteProducts.length === 0 ? renderEmpty('Aucun produit favori') : (
        <View style={styles.productGrid}>
          {favoriteProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                accessibilityRole="button"
                accessibilityLabel={`${product.name}, ${product.price.toFixed(2)} euros par ${product.unit}`}
              >
                <ProductImage uri={product.image_url} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productUnit}>{product.unit}</Text>
                </View>
              </TouchableOpacity>
              <IconButton
                icon="heart"
                label={`Retirer ${product.name} des favoris`}
                selected
                onPress={() => toggleProduct(product.id)}
                color={Colors.danger}
                size={20}
                style={styles.productHeartBtn}
              />
              <View style={styles.productBottom}>
                <Text style={styles.productPrice}>{product.price.toFixed(2)} €</Text>
                {product.is_available && product.stock > 0 ? (
                  <IconButton
                    icon="plus"
                    label={`Ajouter ${product.name} au panier`}
                    onPress={() => handleAddToCart(product)}
                    color={Colors.white}
                    size={20}
                    style={styles.addBtn}
                  />
                ) : (
                  <Text style={styles.unavailable}>Indisponible</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  headerTitle: { fontSize: 24, fontFamily: Fonts.titleHeavy, color: Colors.gray900, marginBottom: Spacing.xs },
  headerSubtitle: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.gray700 },
  error: { marginHorizontal: Spacing.xl, marginTop: Spacing.md, fontSize: 13, fontFamily: Fonts.semibold, color: Colors.danger },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: 3,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  tab: { flex: 1, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', borderRadius: Radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white, elevation: 2 },
  tabText: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.gray700 },
  tabTextActive: { color: Colors.gray900, fontFamily: Fonts.bold },
  producerList: { paddingHorizontal: Spacing.xl },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
  },
  producerMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  producerAvatar: { width: 56, height: 56, borderRadius: Radius.full },
  producerInfo: { flex: 1, marginLeft: Spacing.md },
  producerName: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.gray900, marginBottom: 2 },
  producerMeta: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.gray600 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.xl, justifyContent: 'space-between' },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    elevation: 2,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: 112, resizeMode: 'cover' },
  productHeartBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  productInfo: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  productName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.gray900, marginBottom: 2 },
  productUnit: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600 },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    minHeight: MIN_TOUCH_TARGET + Spacing.sm,
  },
  productPrice: { fontSize: 16, fontFamily: Fonts.heavy, color: Colors.primaryDark },
  addBtn: { borderRadius: Radius.full, backgroundColor: Colors.primaryDark },
  unavailable: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.danger },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxxl * 2 },
  emptyText: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: Spacing.lg },
})
