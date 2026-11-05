import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import api from '../services/api'
import { useAuthStore } from '../store/auth.store'
import type { Recommendation } from '../types/catalog'
import { ProductImage } from './ProductImage'
import { Colors, Fonts, Radius, Spacing } from '../theme'

interface RecommendationsCarouselProps {
  onOpenProduct: (productId: string) => void
}

/**
 * AI-2 : produits populaires jamais achetés par l'utilisateur (GET /ai/recommendations).
 * Réservé aux comptes connectés ; masqué s'il n'y a rien à proposer.
 */
export function RecommendationsCarousel({ onOpenProduct }: RecommendationsCarouselProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [items, setItems] = useState<Recommendation[]>([])

  useFocusEffect(useCallback(() => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    api.get<Recommendation[]>('/ai/recommendations')
      .then(({ data }) => setItems(data))
      // Bloc facultatif : en cas d'erreur on ne l'affiche simplement pas
      .catch(() => setItems([]))
  }, [isAuthenticated]))

  if (items.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Recommandé pour vous</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => onOpenProduct(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.price.toFixed(2)} euros par ${item.unit}, chez ${item.producer_name}`}
          >
            <ProductImage uri={item.image_url} style={styles.image} />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.producer} numberOfLines={1}>{item.producer_name}</Text>
              <Text style={styles.price}>{item.price.toFixed(2)} € / {item.unit}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing.md },
  title: { fontSize: 17, fontFamily: Fonts.title, color: Colors.dark, paddingHorizontal: Spacing.xl, marginBottom: Spacing.sm },
  list: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  card: {
    width: 150,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 90, resizeMode: 'cover' },
  body: { padding: Spacing.sm },
  name: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.dark },
  producer: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.gray600 },
  price: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.primaryDark, marginTop: 4 },
})
