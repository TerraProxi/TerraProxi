import { useState } from 'react'
import { ScrollView, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api, { apiErrorMessage, apiErrorStatus } from '../services/api'
import { useAuthStore } from '../store/auth.store'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { Colors, Fonts } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'ChangePassword'>

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const HTTP_WRONG_PASSWORD = 403

/**
 * AUTH-6 : PUT /users/me/password. Le serveur révoque toutes les sessions du compte :
 * l'utilisateur doit se reconnecter avec son nouveau mot de passe.
 */
export function ChangePasswordScreen({ navigation }: Props) {
  const logout = useAuthStore((s) => s.logout)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isSaving, setSaving] = useState(false)

  const validationError = (() => {
    if (newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH) return `Au moins ${MIN_PASSWORD_LENGTH} caractères.`
    if (confirmation.length > 0 && confirmation !== newPassword) return 'Les deux mots de passe ne correspondent pas.'
    return null
  })()

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/users/me/password', { current_password: currentPassword, new_password: newPassword })
      await logout()
      navigation.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Login' }] })
      Alert.alert('Mot de passe modifié', 'Par sécurité, toutes vos sessions ont été fermées. Reconnectez-vous avec votre nouveau mot de passe.')
    } catch (err) {
      const message = apiErrorStatus(err) === HTTP_WRONG_PASSWORD
        ? 'Mot de passe actuel incorrect.'
        : apiErrorMessage(err, 'Le mot de passe n\'a pas pu être modifié')
      Alert.alert('Modification impossible', message)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(currentPassword && newPassword && confirmation) && validationError === null

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoComplete="password" />
        <FormField
          label={`Nouveau mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum)`}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
        <FormField
          label="Confirmer le nouveau mot de passe"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
        {validationError && <Text style={styles.error} accessibilityLiveRegion="polite">{validationError}</Text>}
        <PrimaryButton label="Changer le mot de passe" onPress={save} isLoading={isSaving} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1, backgroundColor: Colors.gray50 },
  error: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.danger, marginBottom: 12 },
})
