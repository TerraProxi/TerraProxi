import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api from '../services/api'
import { useCartStore } from '../store/cart.store'

type Props = StackScreenProps<RootStackParamList, 'ProducerProfile'>

interface Producer {
  id: string; user_id: string; company_name: string
  description?: string; city?: string; is_verified: boolean
}
interface Product {
  id: string; name: string; price: number; unit: string
  stock: number; is_available: boolean; producer_id: string; category: string
}

export function ProducerProfileScreen({ route, navigation }: Props) {
  const { producerId } = route.params
  const [producer, setProducer] = useState<Producer | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const add = useCartStore((s) => s.add)

  useEffect(() => {
    Promise.all([
      api.get<Producer>(`/producers/${producerId}`),
      api.get<Product[]>('/products', { params: { producer_id: producerId, available: 'true' } }),
    ]).then(([pRes, prRes]) => {
      setProducer(pRes.data)
      setProducts(prRes.data)
      navigation.setOptions({ title: pRes.data.company_name })
    }).finally(() => setLoading(false))
  }, [producerId])

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#5BAE6A" size="large" />
  if (!producer) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Producteur introuvable</Text></View>

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F9F6' }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{producer.company_name}{producer.is_verified ? ' ✅' : ''}</Text>
        {producer.city && <Text style={styles.city}>📍 {producer.city}</Text>}
        {producer.description && <Text style={styles.desc}>{producer.description}</Text>}
        <TouchableOpacity
          onPress={() => navigation.navigate('Conversation', { partnerId: producer.user_id, partnerName: producer.company_name })}
          style={styles.contactBtn}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>💬 Contacter</Text>
        </TouchableOpacity>
      </View>

      {/* Produits */}
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Produits disponibles ({products.length})</Text>
        {products.length === 0 ? (
          <Text style={{ color: '#9CA3AF' }}>Aucun produit disponible.</Text>
        ) : (
          products.map((p) => (
            <View key={p.id} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productPrice}>{Number(p.price).toFixed(2)} € / {p.unit}</Text>
                <Text style={{ fontSize: 12, color: p.stock > 0 ? '#5BAE6A' : '#DC2626' }}>
                  {p.stock > 0 ? `${p.stock} disponible${p.stock > 1 ? 's' : ''}` : 'Rupture'}
                </Text>
              </View>
              {p.stock > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    add({ id: p.id, name: p.name, price: p.price, unit: p.unit, producer_id: p.producer_id })
                    Alert.alert('✓ Ajouté', `${p.name} ajouté au panier`)
                  }}
                  style={styles.addBtn}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>+ Panier</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header:      { backgroundColor: '#EBF8F0', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2EEE2' },
  name:        { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 4 },
  city:        { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  desc:        { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  contactBtn:  { backgroundColor: '#76CCD6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
  productRow:  { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2EEE2', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productName: { fontWeight: '700', fontSize: 14, color: '#333', marginBottom: 2 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#5BAE6A', marginBottom: 2 },
  addBtn:      { backgroundColor: '#76CCD6', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
})
