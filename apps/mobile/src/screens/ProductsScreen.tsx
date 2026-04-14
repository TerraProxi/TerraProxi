import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'
import { useUiStore } from '../store/ui.store'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  unit: string
  category: string
  producer_id: string
  producer_name?: string
  is_available: boolean
}

const COLORS = { primary: '#76CCD6', secondary: '#5BAE6A', dark: '#333', muted: '#9CA3AF', white: '#fff', border: '#E2EEE2' }

export function ProductsScreen() {
  const darkMode = useUiStore((s) => s.darkMode)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const add = useCartStore((s) => s.add)
  const replaceWith = useCartStore((s) => s.replaceWith)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Product[]>('/products', {
        params: { available: 'true', search: search || undefined, limit: 40 },
      })
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = (product: Product) => {
    const cartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      unit: product.unit,
      producer_id: product.producer_id,
    }

    const result = add(cartProduct)
    if (result === 'conflict') {
      Alert.alert(
        'Panier lie a un autre producteur',
        'Ton panier contient deja des articles d\'un autre producteur. Voulez-vous le vider et ajouter ce produit ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vider le panier',
            style: 'destructive',
            onPress: () => {
              replaceWith(cartProduct)
              Alert.alert('✓ Ajoute', `${product.name} ajoute au panier`)
            },
          },
        ],
      )
      return
    }

    Alert.alert('✓ Ajoute', result === 'updated' ? `${product.name} quantite mise a jour` : `${product.name} ajoute au panier`)
  }

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#0B1220' : '#F6F9F6' }}>
      <View style={[styles.searchRow, darkMode && styles.searchRowDark]}>
        <TextInput
          placeholder="Rechercher un produit…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          style={[styles.searchInput, darkMode && styles.searchInputDark]}
          placeholderTextColor={darkMode ? '#94A3B8' : COLORS.muted}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 12, backgroundColor: darkMode ? '#0B1220' : '#F6F9F6', flexGrow: 1 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, darkMode && styles.cardDark]}>
              <View style={[styles.imageBox, darkMode && styles.imageBoxDark]}>
                <Text style={{ fontSize: 32 }}>🌿</Text>
              </View>
              <View style={{ padding: 10 }}>
                <Text style={[styles.name, darkMode && styles.textPrimaryDark]} numberOfLines={1}>{item.name}</Text>
                {item.producer_name && (
                  <Text style={[styles.producer, darkMode && styles.textSecondaryDark]} numberOfLines={1}>{item.producer_name}</Text>
                )}
                <Text style={styles.price}>{Number(item.price).toFixed(2)} € / {item.unit}</Text>
                <TouchableOpacity onPress={() => handleAdd(item)} style={styles.addBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Panier</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  searchRow:   { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2EEE2' },
  searchInput: { backgroundColor: '#F6F9F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 15 },
  card:        { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E2EEE2', overflow: 'hidden' },
  imageBox:    { height: 100, backgroundColor: '#EBF8F0', justifyContent: 'center', alignItems: 'center' },
  name:        { fontWeight: '700', fontSize: 14, color: '#333', marginBottom: 2 },
  producer:    { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  price:       { fontWeight: '700', color: '#5BAE6A', fontSize: 15, marginBottom: 8 },
  addBtn:      { backgroundColor: '#76CCD6', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  searchRowDark: { backgroundColor: '#111827', borderBottomColor: '#374151' },
  searchInputDark: { backgroundColor: '#0F172A', color: '#F3F4F6' },
  cardDark: { backgroundColor: '#111827', borderColor: '#374151' },
  imageBoxDark: { backgroundColor: '#0F172A' },
  textPrimaryDark: { color: '#F3F4F6' },
  textSecondaryDark: { color: '#9CA3AF' },
})
