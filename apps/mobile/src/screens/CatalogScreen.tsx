import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, FlatList, ScrollView, TextInput, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Fonts, MIN_TOUCH_TARGET, Spacing, Radius } from '../theme'
import { api } from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'
import { useCartStore } from '../store/cart.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { CATEGORY_LABELS, type Product, type ProductCategory, type Producer } from '../types/catalog'
import { IconButton } from '../components/IconButton'
import { ProductImage } from '../components/ProductImage'
import { LoadingState, MessageState } from '../components/ScreenState'

type Props = StackScreenProps<RootStackParamList, 'Catalog'>

type CategoryFilter = ProductCategory | 'ALL'

const NOTICE_DURATION_MS = 1800

export function CatalogScreen({ route, navigation }: Props) {
  const { producerId } = route.params
  const insets = useSafeAreaInsets()
  const add = useCartStore((s) => s.add)
  const count = useCartStore((s) => s.count)
  const total = useCartStore((s) => s.total)
  const toggleProduct = useFavoritesStore((s) => s.toggleProduct)
  const favoriteProductIds = useFavoritesStore((s) => s.productIds)

  const [producer, setProducer] = useState<Producer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL')
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState<string | null>(null)
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const [producerRes, productsRes] = await Promise.all([
      api.get<Producer>(`/producers/${producerId}`),
      api.get<Product[]>('/products', { params: { producer_id: producerId, available: true, limit: 100 } }),
    ])
    setProducer(producerRes.data)
    setProducts(productsRes.data)
  }, [producerId])
  const { isLoading, isRefreshing, error, refresh, reload } = useFocusLoader(load, 'Producteur introuvable')

  const categories = useMemo<CategoryFilter[]>(
    () => ['ALL', ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((p) =>
      (activeCategory === 'ALL' || p.category === activeCategory)
      && (!query || p.name.toLowerCase().includes(query)))
  }, [products, activeCategory, search])

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
  }, [])

  const showCartNotice = (message: string) => {
    setCartNotice(message)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => {
      setCartNotice(null)
      setRecentlyAddedProductId(null)
    }, NOTICE_DURATION_MS)
  }

  const handleAdd = (product: Product) => {
    const result = add({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id,
      producer_name: producer?.company_name,
      image_url: product.image_url ?? undefined,
    })
    setRecentlyAddedProductId(product.id)
    showCartNotice(result === 'updated' ? `Quantité mise à jour : ${product.name}` : `${product.name} ajouté au panier`)
  }

  if (isLoading) return <LoadingState />
  if (!producer) {
    return (
      <MessageState
        icon="alert-circle-outline"
        title="Producteur introuvable"
        message={error ?? undefined}
        actionLabel="Réessayer"
        onAction={reload}
      />
    )
  }

  const renderItem = ({ item }: { item: Product }) => {
    const isFavorite = favoriteProductIds.includes(item.id)
    const isJustAdded = recentlyAddedProductId === item.id
    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${item.price.toFixed(2)} euros par ${item.unit}`}
          accessibilityHint="Ouvre la fiche du produit"
        >
          <ProductImage uri={item.image_url} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productUnit}>{item.unit}</Text>
          </View>
        </TouchableOpacity>
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          label={isFavorite ? `Retirer ${item.name} des favoris` : `Ajouter ${item.name} aux favoris`}
          selected={isFavorite}
          onPress={() => toggleProduct(item.id)}
          color={isFavorite ? Colors.danger : Colors.gray700}
          size={20}
          style={styles.heartBtn}
        />
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>{item.price.toFixed(2)} €</Text>
          <IconButton
            icon={isJustAdded ? 'check' : 'plus'}
            label={`Ajouter ${item.name} au panier`}
            onPress={() => handleAdd(item)}
            color={Colors.white}
            size={20}
            style={[styles.addBtn, isJustAdded && styles.addBtnAdded]}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <IconButton icon="arrow-left" label="Retour" onPress={() => navigation.goBack()} size={24} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Boutique</Text>
          <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{producer.company_name}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.producerCard}>
        <ProductImage uri={producer.banner_url} style={styles.producerAvatar} iconSize={22} />
        <View style={styles.producerInfo}>
          {producer.is_verified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={Colors.primaryDark} />
              <Text style={styles.verifiedText}>Producteur vérifié</Text>
            </View>
          )}
          <Text style={styles.producerDescription} numberOfLines={2}>
            {producer.description ?? producer.city ?? ''}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.gray600} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit…"
          placeholderTextColor={Colors.gray600}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Rechercher un produit"
        />
      </View>

      {cartNotice && (
        <View style={styles.noticeBanner} accessibilityLiveRegion="polite">
          <MaterialCommunityIcons name="check-circle" size={16} color={Colors.green700} />
          <Text style={styles.noticeText} numberOfLines={1}>{cartNotice}</Text>
        </View>
      )}

      <ScrollView horizontal style={styles.pillsScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, isActive && styles.pillActive]}
              onPress={() => setActiveCategory(cat)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                {cat === 'ALL' ? 'Tous' : CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={[Colors.primaryDark]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="basket-outline" size={48} color={Colors.gray400} />
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
      />

      {count > 0 && (
        <TouchableOpacity
          style={[styles.cartBar, { paddingBottom: insets.bottom + Spacing.md }]}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Voir le panier : ${count} article${count > 1 ? 's' : ''}, ${total.toFixed(2)} euros`}
        >
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{count}</Text>
            </View>
            <Text style={styles.cartBarLabel}>Voir le panier</Text>
          </View>
          <Text style={styles.cartBarTotal}>{total.toFixed(2)} €</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerSpacer: { width: MIN_TOUCH_TARGET },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName: { fontSize: 16, fontFamily: Fonts.title, color: Colors.dark, marginTop: 1 },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  producerAvatar: { width: 48, height: 48, borderRadius: 24 },
  producerInfo: { marginLeft: Spacing.md, flex: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  verifiedText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.primaryDark },
  producerDescription: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.gray700 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    minHeight: MIN_TOUCH_TARGET,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.dark,
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.green50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.green100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  noticeText: { flex: 1, fontSize: 12, fontFamily: Fonts.semibold, color: Colors.green700 },
  pillsScroll: { flexGrow: 0 },
  pillsContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  pillActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  pillText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.gray700 },
  pillTextActive: { color: Colors.white },
  gridContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 100, flexGrow: 1 },
  gridRow: { gap: Spacing.md },
  productCard: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  productImage: { width: '100%', height: 128, resizeMode: 'cover' },
  heartBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  productInfo: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  productName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.dark },
  productUnit: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: 2 },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  productPrice: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.primaryDark },
  addBtn: { borderRadius: 22, backgroundColor: Colors.primaryDark },
  addBtnAdded: { backgroundColor: Colors.green700 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray900,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cartBadge: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.white },
  cartBarLabel: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.white },
  cartBarTotal: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.accent },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.gray600, marginTop: Spacing.sm },
})
