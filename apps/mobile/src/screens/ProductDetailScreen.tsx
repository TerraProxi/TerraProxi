import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'
import { useFavoritesStore } from '../store/favorites.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { CATEGORY_LABELS, type Product } from '../types/catalog'
import { IconButton } from '../components/IconButton'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProductImage } from '../components/ProductImage'
import { LoadingState, MessageState } from '../components/ScreenState'
import { Colors, Fonts, MIN_TOUCH_TARGET, Radius, Spacing } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'ProductDetail'>

/** Fiche produit (CAT-5) : GET /products/{id}. */
export function ProductDetailScreen({ route, navigation }: Props) {
  const { productId } = route.params
  const addToCart = useCartStore((s) => s.add)
  const isFavorite = useFavoritesStore((s) => s.productIds.includes(productId))
  const toggleProduct = useFavoritesStore((s) => s.toggleProduct)
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)

  const load = useCallback(async () => {
    const { data } = await api.get<Product>(`/products/${productId}`)
    setProduct(data)
  }, [productId])
  const { isLoading, error, reload } = useFocusLoader(load, 'Produit introuvable')

  if (isLoading) return <LoadingState />
  if (!product) {
    return <MessageState icon="alert-circle-outline" title="Produit introuvable" message={error ?? undefined} actionLabel="Réessayer" onAction={reload} />
  }

  const isOrderable = product.is_available && product.stock > 0
  const maxQuantity = Math.max(1, product.stock)

  const handleAdd = () => {
    const result = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id,
      producer_name: product.producer_name,
      image_url: product.image_url ?? undefined,
    }, quantity)
    Alert.alert(
      result === 'updated' ? 'Panier mis à jour' : 'Ajouté au panier',
      `${quantity} × ${product.name}`,
      [{ text: 'Continuer' }, { text: 'Voir le panier', onPress: () => navigation.navigate('Cart') }],
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProductImage uri={product.image_url} style={styles.image} iconSize={56} />

      <View style={styles.titleRow}>
        <View style={styles.titleTexts}>
          <Text style={styles.category}>{CATEGORY_LABELS[product.category]}</Text>
          <Text style={styles.name} accessibilityRole="header">{product.name}</Text>
        </View>
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          selected={isFavorite}
          onPress={() => toggleProduct(product.id)}
          color={isFavorite ? Colors.danger : Colors.gray700}
          size={26}
        />
      </View>

      <Text style={styles.price}>
        {product.price.toFixed(2)} € <Text style={styles.unit}>/ {product.unit}</Text>
      </Text>
      <Text style={[styles.stock, !isOrderable && styles.stockOut]}>
        {isOrderable ? `En stock : ${product.stock}` : 'Indisponible pour le moment'}
      </Text>

      {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

      {product.producer_name && (
        <TouchableOpacity
          style={styles.producerRow}
          onPress={() => navigation.navigate('ProducerProfile', { producerId: product.producer_id })}
          accessibilityRole="button"
          accessibilityLabel={`Voir le producteur ${product.producer_name}`}
        >
          <MaterialCommunityIcons name="storefront" size={22} color={Colors.primaryDark} />
          <View style={styles.producerTexts}>
            <Text style={styles.producerName}>{product.producer_name}</Text>
            {product.producer_city ? <Text style={styles.producerCity}>{product.producer_city}</Text> : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.gray600} />
        </TouchableOpacity>
      )}

      {isOrderable && (
        <View style={styles.orderRow}>
          <View style={styles.stepper}>
            <IconButton
              icon="minus"
              label="Diminuer la quantité"
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            />
            <Text style={styles.quantity} accessibilityLabel={`Quantité : ${quantity}`}>{quantity}</Text>
            <IconButton
              icon="plus"
              label="Augmenter la quantité"
              onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
            />
          </View>
          <PrimaryButton label="Ajouter au panier" onPress={handleAdd} style={styles.addButton} />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  content: { paddingBottom: Spacing.xxxl },
  image: { width: '100%', height: 260, resizeMode: 'cover' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  titleTexts: { flex: 1 },
  category: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.primaryDark, textTransform: 'uppercase' },
  name: { fontSize: 24, fontFamily: Fonts.title, color: Colors.dark, marginTop: 4 },
  price: { fontSize: 22, fontFamily: Fonts.title, color: Colors.primaryDark, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
  unit: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.gray700 },
  stock: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.green700, paddingHorizontal: Spacing.lg, marginTop: 4 },
  stockOut: { color: Colors.danger },
  description: {
    fontSize: 15, lineHeight: 22, fontFamily: Fonts.regular, color: Colors.gray800,
    paddingHorizontal: Spacing.lg, marginTop: Spacing.lg,
  },
  producerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: MIN_TOUCH_TARGET,
    backgroundColor: Colors.white, marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gray200,
  },
  producerTexts: { flex: 1 },
  producerName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.dark },
  producerCity: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.gray600 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gray200,
  },
  quantity: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.dark, minWidth: 28, textAlign: 'center' },
  addButton: { flex: 1 },
})
