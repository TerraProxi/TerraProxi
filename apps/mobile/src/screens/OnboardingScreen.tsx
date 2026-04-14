import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { Colors } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

export function OnboardingScreen() {
  const nav = useNavigation<Nav>()

  return (
    <View style={styles.container}>
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <TouchableOpacity style={styles.skipBtn} onPress={() => nav.navigate('Tabs')}>
        <Text style={styles.skipText}>Passer</Text>
      </TouchableOpacity>

      <View style={styles.illustration}>
        <View style={styles.outerCircle}>
          <View style={styles.pinsRing}>
            <MaterialCommunityIcons name="map-marker" size={28} color={Colors.primary} style={styles.pin1} />
            <MaterialCommunityIcons name="map-marker" size={22} color={Colors.accent} style={styles.pin2} />
            <MaterialCommunityIcons name="map-marker" size={26} color={Colors.primaryDark} style={styles.pin3} />
            <MaterialCommunityIcons name="map-marker" size={20} color={Colors.accentDark} style={styles.pin4} />
          </View>
          <View style={styles.innerCircle}>
            <MaterialCommunityIcons name="earth" size={52} color={Colors.white} />
          </View>
        </View>
      </View>

      <Text style={styles.title1}>La Fraîcheur</Text>
      <Text style={styles.title2}>Au Coin de la Rue</Text>
      <Text style={styles.subtitle}>
        Connectez-vous directement aux producteurs locaux et recevez des produits frais, bio et de saison.
      </Text>

      <View style={styles.pagination}>
        <View style={[styles.pageDot, styles.pageDotActive]} />
        <View style={styles.pageDot} />
        <View style={styles.pageDot} />
      </View>

      <TouchableOpacity style={styles.ctaBtn} onPress={() => nav.navigate('Tabs')}>
        <Text style={styles.ctaText}>C'est parti</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginRow} onPress={() => nav.navigate('Login')}>
        <Text style={styles.loginText}>
          Déjà un compte ? <Text style={styles.loginLink}>Se connecter</Text>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E8F7FA',
    opacity: 0.5,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray500,
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 36,
  },
  outerCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinsRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pin1: { position: 'absolute', top: 6, left: 90 },
  pin2: { position: 'absolute', top: 50, right: 6 },
  pin3: { position: 'absolute', bottom: 16, left: 20 },
  pin4: { position: 'absolute', top: 56, left: 8 },
  innerCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title1: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary,
    lineHeight: 36,
  },
  title2: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 14,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 36,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray300,
    marginHorizontal: 4,
  },
  pageDotActive: {
    width: 26,
    backgroundColor: Colors.primary,
  },
  ctaBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  loginRow: {
    marginTop: 22,
    marginBottom: 40,
  },
  loginText: {
    fontSize: 14,
    color: Colors.gray600,
  },
  loginLink: {
    fontWeight: '700',
    color: Colors.primary,
  },
})
