import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'

type Nav = StackNavigationProp<RootStackParamList>

export function LoginScreen() {
  const nav = useNavigation<Nav>()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      await login(email, password)
      nav.goBack()
    } catch {
      Alert.alert('Erreur', 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🌱 TerraProxi</Text>
        <Text style={styles.title}>Connexion</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mot de passe</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        </View>

        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btn}>
          <Text style={styles.btnText}>{loading ? 'Connexion…' : 'Se connecter'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => nav.navigate('Register')} style={{ marginTop: 16 }}>
          <Text style={{ textAlign: 'center', color: '#76CCD6', fontWeight: '700' }}>
            Pas de compte ? S'inscrire
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: 'center', backgroundColor: '#F6F9F6' },
  logo:      { fontSize: 28, fontWeight: '800', color: '#5BAE6A', textAlign: 'center', marginBottom: 8 },
  title:     { fontSize: 24, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 32 },
  field:     { marginBottom: 18 },
  label:     { fontWeight: '600', marginBottom: 6, color: '#333' },
  input:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2EEE2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  btn:       { backgroundColor: '#5BAE6A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
})
