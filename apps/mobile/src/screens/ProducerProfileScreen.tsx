import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import api from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'

type Props = StackScreenProps<RootStackParamList, 'ProducerProfile'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface ProducerData {
  id: string
  user_id: string
  company_name: string
  description: string
  address: string
  city: string
  latitude: number
  longitude: number
  banner_url: string
  is_verified: boolean
  first_name: string
  last_name: string
  distance_km: number
  rating: number
  review_count: number
  categories: string[]
  is_open: boolean
}

export function ProducerProfileScreen({ route, navigation }: Props) {
  const { producerId } = route.params
  const { toggleProducer, isProducerFavorite } = useFavoritesStore()
  const [producer, setProducer] = useState<ProducerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get<ProducerData>(`/producers/${producerId}`)
      .then(({ data }) => setProducer(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [producerId])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (error || !producer) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={Colors.gray400} />
        <Text style={styles.errorTitle}>Producteur introuvable</Text>
        <Text style={styles.errorSub}>Ce producteur n'existe pas ou a été supprimé.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const favorite = isProducerFavorite(producer.id)

  const handleShop = () => {
    navigation.navigate('Catalog', { producerId: producer.id })
  }

  const handleMessage = () => {
    navigation.navigate('Conversation', { partnerId: producer.user_id, partnerName: producer.company_name })
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.coverContainer}>
        <Image source={{ uri: producer.banner_url }} style={styles.coverImage} />
        <View style={styles.coverGradient} />
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.topNavBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.topNavRight}>
            <TouchableOpacity style={styles.topNavBtn} onPress={() => toggleProducer(producer.id)}>
              <MaterialCommunityIcons
                name={favorite ? 'heart' : 'heart-outline'}
                size={22}
                color={favorite ? Colors.danger : Colors.white}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topNavBtn}>
              <MaterialCommunityIcons name="share-variant-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.contentCard}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: producer.banner_url }} style={styles.avatar} />
          {producer.is_verified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.producerName}>{producer.company_name}</Text>
        <Text style={styles.producerMeta}>{producer.city}</Text>

        <View style={styles.ratingBadge}>
          <MaterialCommunityIcons name="star" size={18} color={Colors.yellow500} />
          <Text style={styles.ratingText}>{producer.rating}</Text>
          <Text style={styles.reviewCount}>({producer.review_count} avis)</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.shopBtn} onPress={handleShop}>
            <MaterialCommunityIcons name="storefront" size={20} color={Colors.white} />
            <Text style={styles.shopBtnText}>Voir Boutique</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
            <MaterialCommunityIcons name="chat-outline" size={20} color={Colors.primary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="information-outline" size={22} color={Colors.primary} />
          <Text style={styles.sectionTitle}>À propos</Text>
        </View>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>{producer.description}</Text>
          <View style={styles.categoryPills}>
            {producer.categories.map((cat) => (
              <View key={cat} style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="map-marker-outline" size={22} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Localisation</Text>
        </View>
        <View style={styles.locationCard}>
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-marker" size={56} color={Colors.gray300} />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.addressText}>{producer.address}</Text>
            <Text style={styles.distanceText}>{producer.distance_km} km de vous</Text>
          </View>
          <TouchableOpacity style={styles.directionsBtn}>
            <MaterialCommunityIcons name="directions" size={20} color={Colors.white} />
            <Text style={styles.directionsBtnText}>Itinéraire</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
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
  coverContainer: {
    height: 256,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: Spacing.lg,
  },
  topNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    marginTop: -48,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: 64 + Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  avatarContainer: {
    position: 'absolute',
    top: -64,
    alignSelf: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  producerName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'center',
  },
  producerMeta: {
    fontSize: 14,
    color: Colors.gray600,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.yellow50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    gap: 4,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.dark,
  },
  reviewCount: {
    fontSize: 13,
    color: Colors.gray600,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    gap: Spacing.md,
    width: '100%',
  },
  shopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  shopBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  messageBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark,
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray700,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  categoryPill: {
    backgroundColor: Colors.green50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.green700,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    padding: Spacing.lg,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
  },
  distanceText: {
    fontSize: 13,
    color: Colors.gray600,
    marginTop: Spacing.xs,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  directionsBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
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
  errorSub: {
    fontSize: 14,
    color: Colors.gray600,
    textAlign: 'center',
    marginTop: Spacing.sm,
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
})
