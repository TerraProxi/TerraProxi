import { useState } from 'react'
import { Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'
import { apiErrorMessage } from '../services/api'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { Colors, Fonts, MIN_TOUCH_TARGET } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

export function LoginScreen() {
  const nav = useNavigation<Nav>()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = email.trim().length > 0 && password.length > 0

  const handleLogin = async () => {
    setLoading(true)
    try {
      await login(email.trim(), password)
      // Repart des onglets : un retour arrière ne doit pas ramener à l'onboarding ou au formulaire
      nav.reset({ index: 0, routes: [{ name: 'Tabs' }] })
    } catch (err) {
      Alert.alert('Connexion impossible', apiErrorMessage(err, 'Email ou mot de passe incorrect'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>TerraProxi</Text>
        <Text style={styles.title} accessibilityRole="header">Connexion</Text>

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <FormField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={() => { if (canSubmit) void handleLogin() }}
        />

        <PrimaryButton label="Se connecter" onPress={handleLogin} isLoading={loading} disabled={!canSubmit} />

        <TouchableOpacity
          onPress={() => nav.navigate('Register')}
          style={styles.link}
          accessibilityRole="link"
        >
          <Text style={styles.linkText}>Pas de compte ? S'inscrire</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1, justifyContent: 'center', backgroundColor: '#F6F9F6' },
  logo: { fontFamily: Fonts.titleHeavy, fontSize: 28, color: Colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  title: { fontFamily: Fonts.title, fontSize: 24, color: Colors.dark, textAlign: 'center', marginBottom: 32 },
  link: { marginTop: 16, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  linkText: { textAlign: 'center', color: Colors.accentDark, fontFamily: Fonts.bold, fontSize: 15 },
})
