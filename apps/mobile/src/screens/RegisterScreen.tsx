import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuthStore } from '../store/auth.store'

export function RegisterScreen() {
  const nav = useNavigation()
  const register = useAuthStore((s) => s.register)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    role: 'CONSUMER' as 'CONSUMER' | 'PRODUCER',
    gdpr_consent: false,
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const handleRegister = async () => {
    if (!form.gdpr_consent) { Alert.alert('RGPD', 'Vous devez accepter la politique de confidentialité'); return }
    setLoading(true)
    try {
      await register(form)
      nav.goBack()
    } catch {
      Alert.alert('Erreur', 'L\'inscription a échoué')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Créer un compte</Text>

        {/* Rôle */}
        <View style={styles.roleRow}>
          {(['CONSUMER', 'PRODUCER'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => set('role', role)}
              style={[styles.roleBtn, form.role === role && styles.roleBtnActive]}
            >
              <Text style={form.role === role ? styles.roleLabelActive : styles.roleLabel}>
                {role === 'CONSUMER' ? '🛒 Consommateur' : '🌾 Producteur'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { key: 'first_name', label: 'Prénom', type: 'default' as const },
          { key: 'last_name',  label: 'Nom',    type: 'default' as const },
          { key: 'email',      label: 'Email',   type: 'email-address' as const },
          { key: 'password',   label: 'Mot de passe (8+ car.)', type: 'default' as const, secure: true },
        ].map((f) => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={(form as unknown as Record<string, string>)[f.key]}
              onChangeText={(v) => set(f.key, v)}
              keyboardType={f.type}
              secureTextEntry={f.secure}
              autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
            />
          </View>
        ))}

        <TouchableOpacity onPress={() => set('gdpr_consent', !form.gdpr_consent)} style={styles.gdprRow}>
          <View style={[styles.checkbox, form.gdpr_consent && { backgroundColor: '#5BAE6A', borderColor: '#5BAE6A' }]}>
            {form.gdpr_consent && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>
          <Text style={styles.gdprText}>J'accepte la politique de confidentialité et le traitement de mes données (RGPD)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.btn}>
          <Text style={styles.btnText}>{loading ? 'Création…' : 'Créer mon compte'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:       { padding: 24, flexGrow: 1, backgroundColor: '#F6F9F6' },
  title:           { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 24, textAlign: 'center' },
  roleRow:         { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn:         { flex: 1, borderWidth: 1.5, borderColor: '#E2EEE2', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  roleBtnActive:   { borderColor: '#5BAE6A', backgroundColor: '#EBFAEF' },
  roleLabel:       { fontWeight: '600', color: '#333' },
  roleLabelActive: { fontWeight: '700', color: '#5BAE6A' },
  field:           { marginBottom: 16 },
  label:           { fontWeight: '600', marginBottom: 6, color: '#333', fontSize: 14 },
  input:           { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2EEE2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  gdprRow:         { flexDirection: 'row', gap: 12, marginBottom: 20, alignItems: 'flex-start' },
  checkbox:        { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: '#E2EEE2', justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  gdprText:        { flex: 1, fontSize: 13, color: '#6B7280' },
  btn:             { backgroundColor: '#5BAE6A', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
})
