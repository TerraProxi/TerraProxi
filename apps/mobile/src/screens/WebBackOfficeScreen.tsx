import { View, Text, StyleSheet, Linking, Alert } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/auth.store'
import { WEB_URL } from '../config'
import { PrimaryButton } from '../components/PrimaryButton'
import { Colors, Fonts, Spacing } from '../theme'

const BACK_OFFICE_URL = `${WEB_URL}/producer/dashboard`

/**
 * L'application mobile est réservée aux consommateurs : un compte producteur (ou
 * administrateur) est invité à utiliser le back-office web.
 */
export function WebBackOfficeScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const openBackOffice = () => {
    Linking.openURL(BACK_OFFICE_URL).catch(() =>
      Alert.alert('Navigateur indisponible', `Ouvrez ${BACK_OFFICE_URL} depuis un navigateur.`),
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xxxl }]}>
      <MaterialCommunityIcons name="monitor-dashboard" size={72} color={Colors.primaryDark} />
      <Text style={styles.title} accessibilityRole="header">Espace producteur sur le web</Text>
      <Text style={styles.text}>
        Bonjour {user?.first_name}, l'application mobile TerraProxi est destinée aux consommateurs.
        Gérez votre boutique, vos produits et vos commandes depuis le back-office web.
      </Text>
      <Text style={styles.url}>{WEB_URL.replace(/^https?:\/\//, '')}</Text>
      <PrimaryButton label="Ouvrir le back-office" onPress={openBackOffice} style={styles.button} />
      <PrimaryButton label="Se déconnecter" variant="outline" onPress={() => void logout()} style={styles.button} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: Colors.white, paddingHorizontal: Spacing.xxl },
  title: { fontFamily: Fonts.title, fontSize: 22, color: Colors.dark, textAlign: 'center', marginTop: Spacing.xl },
  text: {
    fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22, color: Colors.gray700,
    textAlign: 'center', marginTop: Spacing.md,
  },
  url: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.primaryDark, marginTop: Spacing.lg },
  button: { alignSelf: 'stretch', marginTop: Spacing.lg },
})
