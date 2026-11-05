import { useState } from 'react'
import { ScrollView, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api, { apiErrorMessage, apiErrorStatus } from '../services/api'
import { useAuthStore, type User } from '../store/auth.store'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { Colors, Fonts } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'ChangeEmail'>

const HTTP_WRONG_PASSWORD = 403
const HTTP_EMAIL_TAKEN = 409

function changeEmailError(err: unknown): string {
  const status = apiErrorStatus(err)
  if (status === HTTP_WRONG_PASSWORD) return 'Mot de passe actuel incorrect.'
  if (status === HTTP_EMAIL_TAKEN) return 'Cette adresse est déjà utilisée par un autre compte.'
  return apiErrorMessage(err, 'L\'adresse n\'a pas pu être modifiée')
}

/** AUTH-6 : PUT /users/me/email, confirmé par le mot de passe actuel. */
export function ChangeEmailScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isSaving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.put<User>('/users/me/email', {
        current_password: currentPassword,
        new_email: newEmail.trim(),
      })
      setUser(data)
      Alert.alert('Adresse modifiée', `Votre adresse est désormais ${data.email}.`)
      navigation.goBack()
    } catch (err) {
      Alert.alert('Modification impossible', changeEmailError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.current}>Adresse actuelle : {user?.email}</Text>
        <FormField
          label="Nouvelle adresse email"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormField
          label="Mot de passe actuel"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoComplete="password"
        />
        <PrimaryButton
          label="Changer d'adresse"
          onPress={save}
          isLoading={isSaving}
          disabled={!newEmail.trim() || !currentPassword}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1, backgroundColor: Colors.gray50 },
  current: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray700, marginBottom: 20 },
})
