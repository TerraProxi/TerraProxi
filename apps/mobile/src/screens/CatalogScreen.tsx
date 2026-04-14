import { useState, useMemo } from 'react'
import {
  View, Text, FlatList, ScrollView, TextInput, Image,
  TouchableOpacity, StyleSheet,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import { useMockStore } from '../store/mock.store'
import { useCartStore } from '../store/cart.store'
import type { Product } from '../store/mock.store'

type Props = StackScreenProps<RootStackParamList, 'ProducerProfile'> & {
  route: { params: { producerId: string } }
}

const ALL_CATEGORIES = ['Tous', 'Légumes', 'Crèmerie', 'Fruits', 'Fromage', 'Épicerie', 'Boissons', 'Vins', 'Viande', 'Œufs']

export function CatalogScreen({ route, navigation }: Props) {
  const { producerId } = route.params
  const { producers, products } = useMockStore()
  const { add, count, total } = useCartStore()

  const producer = producers.find((p) => p.id === producerId)

  const producerProducts = useMemo(
    () => products.filter((p) => p.producerId === producerId),
    [products, producerId],
  )

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tous')

  const filteredProducts = useMemo(() => {
    let result = producerProducts
    if (activeCategory !== 'Tous') {
      result = result.filter((p) => p.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    return result
  }, [producerProducts, activeCategory, search])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(producerProducts.map((p) => p.category)))
    return ['Tous', ...unique]
  }, [producerProducts])

  const handleAdd = (product: Product) => {
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producerId,
    })
  }

  const handleCartPress = () => {
    navigation.navigate('Cart')
  }

  if (!producer) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.gray400} />
        <Text style={styles.errorTitle}>Producteur introuvable</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        {item.isBestseller && (
          <View style={styles.bestsellerBadge}>
            <Text style={styles.bestsellerText}>Top Vente</Text>
          </View>
        )}
        {item.isSeasonal && !item.isBestseller && (
          <View style={styles.seasonalBadge}>
            <Text style={styles.seasonalText}>De Saison</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn}>
          <MaterialCommunityIcons name="heart-outline" size={18} color={Colors.gray600} />
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.productUnit}>{item.unit}</Text>
        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>{item.price.toFixed(2)} €</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)}>
            <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.dark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Producteur</Text>
          <Text style={styles.headerName} numberOfLines={1}>{producer.name}</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.producerCard}>
        <Image source={{ uri: producer.avatar }} style={styles.producerAvatar} />
        <View style={styles.producerInfo}>
          <View style={styles.bioBadge}>
            <MaterialCommunityIcons name="leaf" size={14} color={Colors.primary} />
            <Text style={styles.bioText}>Bio & Local</Text>
          </View>
          <Text style={styles.producerTagline} numberOfLines={1}>{producer.tagline}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.gray500} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un produit…"
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, activeCategory === cat && styles.pillActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.pillText, activeCategory === cat && styles.pillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="basket-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>Aucun produit trouvé</Text>
          </View>
        }
      />

      {count > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={handleCartPress} activeOpacity={0.8}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{count}</Text>
            </View>
            <Text style={styles.cartBarLabel}>Voir Panier</Text>
          </View>
          <View style={styles.cartBarRight}>
            <Text style={styles.cartBarTotal}>{total.toFixed(2)} €</Text>
            <Text style={styles.cartBarPay}>Payer →</Text>
          </View>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 1,
  },
  producerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  producerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
  },
  producerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  bioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  bioText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  producerTagline: {
    fontSize: 13,
    color: Colors.gray600,
    marginTop: 4,
  },
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
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    marginLeft: Spacing.sm,
    paddingVertical: 0,
  },
  pillsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginRight: Spacing.sm,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray700,
  },
  pillTextActive: {
    color: Colors.white,
  },
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  gridRow: {
    gap: Spacing.md,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    height: 128,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bestsellerBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  bestsellerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  seasonalBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  seasonalText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  heartBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingVertical: Spacing.md,
    paddingBottom: 28,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cartBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  cartBarLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cartBarTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  cartBarPay: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    padding: Spacing.xxxl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    marginTop: Spacing.lg,
  },
  errorBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
  },
  errorBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },
})
