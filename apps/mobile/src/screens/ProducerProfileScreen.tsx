import { useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform, Share } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors, Spacing, Radius } from '../theme'
import api from '../services/api'
import { useFavoritesStore } from '../store/favorites.store'
import { useAuthStore } from '../store/auth.store'
import { WEB_URL } from '../config'
import type { Producer } from '../types/catalog'
import { IconButton } from '../components/IconButton'
import { ProductImage } from '../components/ProductImage'

type Props = StackScreenProps<RootStackParamList, 'ProducerProfile'>

export function ProducerProfileScreen({ route, navigation }: Props) {
  const { producerId } = route.params
  const toggleProducer = useFavoritesStore((s) => s.toggleProducer)
  const favoriteProducerIds = useFavoritesStore((s) => s.producerIds)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [producer, setProducer] = useState<Producer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get<Producer>(`/producers/${producerId}`)
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

  const favorite = favoriteProducerIds.includes(producer.id)

  const handleShop = () => {
    navigation.navigate('Catalog', { producerId: producer.id })
  }

  const handleMessage = () => {
    // La messagerie exige un compte : on passe d'abord par la connexion
    if (!isAuthenticated) {
      navigation.navigate('Login')
      return
    }
    navigation.navigate('Conversation', { partnerId: producer.user_id, partnerName: producer.company_name })
  }

  const handleShare = () => {
    const url = `${WEB_URL}/producers/${producer.id}`
    Share.share({ title: producer.company_name, message: `${producer.company_name} sur TerraProxi : ${url}` })
      .catch(() => Alert.alert('Partage impossible', 'Le partage n\'est pas disponible sur cet appareil.'))
  }

  const handleDirections = async () => {
    const hasCoordinates = producer.latitude != null && producer.longitude != null
    const destinationLabel = encodeURIComponent([producer.company_name, producer.address, producer.city].filter(Boolean).join(', '))

    const appUrls = hasCoordinates
      ? Platform.select({
          ios: [
            `maps://?daddr=${producer.latitude},${producer.longitude}`,
            `comgooglemaps://?daddr=${producer.latitude},${producer.longitude}&directionsmode=driving`,
          ],
          android: [`google.navigation:q=${producer.latitude},${producer.longitude}`],
          default: [],
        }) ?? []
      : Platform.select({
          ios: [
            `maps://?daddr=${destinationLabel}`,
            `comgooglemaps://?daddr=${destinationLabel}&directionsmode=driving`,
          ],
          android: [`google.navigation:q=${destinationLabel}`],
          default: [],
        }) ?? []

    const webFallback = hasCoordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${producer.latitude},${producer.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destinationLabel}`

    try {
      for (const url of appUrls) {
        const supported = await Linking.canOpenURL(url)
        if (supported) {
          await Linking.openURL(url)
          return
        }
      }

      await Linking.openURL(webFallback)
    } catch {
      Alert.alert('Impossible d\'ouvrir la navigation', 'Veuillez vérifier qu\'une application de cartes est installée.')
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.coverContainer}>
        <ProductImage uri={producer.banner_url} style={styles.coverImage} iconSize={56} />
        <View style={styles.coverGradient} />
        <View style={styles.topNav}>
          <IconButton icon="arrow-left" label="Retour" onPress={() => navigation.goBack()} color={Colors.white} style={styles.topNavBtn} />
          <View style={styles.topNavRight}>
            <IconButton
              icon={favorite ? 'heart' : 'heart-outline'}
              label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              selected={favorite}
              onPress={() => toggleProducer(producer.id)}
              color={favorite ? Colors.danger : Colors.white}
              style={styles.topNavBtn}
            />
            <IconButton
              icon="share-variant-outline"
              label={`Partager la fiche de ${producer.company_name}`}
              onPress={handleShare}
              color={Colors.white}
              size={20}
              style={styles.topNavBtn}
            />
          </View>
        </View>
      </View>

      <View style={styles.contentCard}>
        <View style={styles.avatarContainer}>
          <ProductImage uri={producer.banner_url} style={styles.avatar} />
          {producer.is_verified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-circle" size={22} color={Colors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.producerName}>{producer.company_name}</Text>
        <Text style={styles.producerMeta}>{producer.city}</Text>

        {producer.opening_hours ? (
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Colors.primary} />
            <Text style={styles.reviewCount}>{producer.opening_hours}</Text>
          </View>
        ) : null}

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
          {producer.description ? <Text style={styles.aboutText}>{producer.description}</Text> : null}
          <View style={styles.categoryPills}>
            {(producer.categories ?? []).map((cat) => (
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
            <Text style={styles.addressText}>{[producer.address, producer.postal_code, producer.city].filter(Boolean).join(', ')}</Text>
            {producer.distance_km != null && (
              <Text style={styles.distanceText}>{producer.distance_km.toFixed(1)} km de vous</Text>
            )}
          </View>
          <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
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
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
