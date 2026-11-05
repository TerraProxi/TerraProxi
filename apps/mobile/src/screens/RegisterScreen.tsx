import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, Linking,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore, type RegisterData } from '../store/auth.store'
import { apiErrorMessage } from '../services/api'
import { WEB_URL } from '../config'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { Colors, Fonts, MIN_TOUCH_TARGET } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

const MIN_PASSWORD_LENGTH = 8

const EMPTY_FORM: RegisterData = { first_name: '', last_name: '', email: '', password: '', gdpr_consent: false }

export function RegisterScreen() {
  const nav = useNavigation<Nav>()
  const register = useAuthStore((s) => s.register)
  const [form, setForm] = useState<RegisterData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  const update = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleRegister = async () => {
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Mot de passe trop court', `Au moins ${MIN_PASSWORD_LENGTH} caractères.`)
      return
    }
    if (!form.gdpr_consent) {
      Alert.alert('RGPD', 'Vous devez accepter la politique de confidentialité')
      return
    }
    setLoading(true)
    try {
      await register({ ...form, email: form.email.trim() })
      nav.reset({ index: 0, routes: [{ name: 'Tabs' }] })
    } catch (err) {
      Alert.alert('Inscription impossible', apiErrorMessage(err, 'L\'inscription a échoué'))
    } finally {
      setLoading(false)
    }
  }

  const isComplete = Boolean(form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.password)

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">Créer un compte</Text>

        <FormField label="Prénom" value={form.first_name} onChangeText={(v) => update('first_name', v)} autoComplete="given-name" />
        <FormField label="Nom" value={form.last_name} onChangeText={(v) => update('last_name', v)} autoComplete="family-name" />
        <FormField
          label="Email"
          value={form.email}
          onChangeText={(v) => update('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormField
          label={`Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum)`}
          value={form.password}
          onChangeText={(v) => update('password', v)}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          onPress={() => update('gdpr_consent', !form.gdpr_consent)}
          style={styles.gdprRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.gdpr_consent }}
        >
          <View style={[styles.checkbox, form.gdpr_consent && styles.checkboxChecked]}>
            {form.gdpr_consent && <MaterialCommunityIcons name="check" size={16} color={Colors.white} />}
          </View>
          <Text style={styles.gdprText}>
            J'accepte la politique de confidentialité et le traitement de mes données (RGPD)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void Linking.openURL(`${WEB_URL}/privacy`)}
          style={styles.privacyLink}
          accessibilityRole="link"
        >
          <Text style={styles.privacyText}>Lire la politique de confidentialité</Text>
        </TouchableOpacity>

        <PrimaryButton label="Créer mon compte" onPress={handleRegister} isLoading={loading} disabled={!isComplete} />

        <Text style={styles.producerHint}>
          Vous êtes producteur ? Créez votre compte et gérez votre boutique depuis le site web.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1, backgroundColor: '#F6F9F6' },
  title: { fontFamily: Fonts.title, fontSize: 24, color: Colors.dark, marginBottom: 24, textAlign: 'center' },
  gdprRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: MIN_TOUCH_TARGET },
  checkbox: {
    width: 24, height: 24, borderRadius: 5, borderWidth: 1.5, borderColor: Colors.gray600,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  gdprText: { flex: 1, fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray700 },
  privacyLink: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center', marginBottom: 12 },
  privacyText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.accentDark, textDecorationLine: 'underline' },
  producerHint: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.gray700, textAlign: 'center', marginTop: 20 },
})
