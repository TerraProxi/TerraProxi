import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useAuthStore } from '../store/auth.store'
import { Colors } from '../theme'

type Nav = StackNavigationProp<RootStackParamList>

export function AuthScreen() {
  const nav = useNavigation<Nav>()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
      nav.navigate('Tabs')
    } catch {
      Alert.alert('Erreur', 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="spa" size={32} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Bon retour</Text>
        <Text style={styles.subtitle}>Connectez-vous pour accéder à votre marché local</Text>

        <View style={styles.field}>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="email-outline" size={20} color={Colors.gray400} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.gray400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.inputWrap}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.gray400} />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor={Colors.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.showBtn}>{showPassword ? 'Masquer' : 'Voir'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotRow}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.loginBtnText}>{loading ? 'Connexion…' : 'Se Connecter'}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Ou continuer avec</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="google" size={24} color={Colors.gray700} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="apple" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.registerRow} onPress={() => nav.navigate('Register')}>
          <Text style={styles.registerText}>
            Pas encore de compte ? <Text style={styles.registerLink}>S'inscrire</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 36,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray600,
    lineHeight: 22,
    marginBottom: 36,
  },
  field: {
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 2,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: Colors.dark,
  },
  showBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  loginBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.gray500,
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 36,
  },
  socialBtn: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.gray50,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerRow: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: Colors.gray600,
  },
  registerLink: {
    fontWeight: '700',
    color: Colors.primary,
  },
})
