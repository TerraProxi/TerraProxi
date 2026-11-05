import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import api, { apiErrorMessage } from '../services/api'
import { useAuthStore, type User } from '../store/auth.store'
import { useFocusLoader } from '../hooks/useFocusLoader'
import { FormField } from '../components/FormField'
import { PrimaryButton } from '../components/PrimaryButton'
import { LoadingState, MessageState } from '../components/ScreenState'
import { Colors } from '../theme'

type Props = StackScreenProps<RootStackParamList, 'EditProfile'>

const MAX_NAME_LENGTH = 100
const MAX_PHONE_LENGTH = 20

/** Modification du profil : PATCH /users/profile (specs/api/users-api.yaml). */
export function EditProfileScreen({ navigation }: Props) {
  const setUser = useAuthStore((s) => s.setUser)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [isLoaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (isLoaded) return
    const { data } = await api.get<User>('/users/profile')
    setFirstName(data.first_name)
    setLastName(data.last_name)
    setPhone(data.phone ?? '')
    setLoaded(true)
  }, [isLoaded])
  const { isLoading, error, reload } = useFocusLoader(load, 'Impossible de charger votre profil')

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch<User>('/users/profile', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      })
      setUser(data)
      navigation.goBack()
    } catch (err) {
      Alert.alert('Enregistrement impossible', apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <LoadingState />
  if (!isLoaded) {
    return <MessageState icon="account-alert-outline" title="Profil indisponible" message={error ?? undefined} actionLabel="Réessayer" onAction={reload} />
  }

  const isValid = firstName.trim().length > 0 && lastName.trim().length > 0

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FormField label="Prénom" value={firstName} onChangeText={setFirstName} maxLength={MAX_NAME_LENGTH} autoComplete="given-name" />
        <FormField label="Nom" value={lastName} onChangeText={setLastName} maxLength={MAX_NAME_LENGTH} autoComplete="family-name" />
        <FormField
          label="Téléphone (facultatif)"
          value={phone}
          onChangeText={setPhone}
          maxLength={MAX_PHONE_LENGTH}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <PrimaryButton label="Enregistrer" onPress={save} isLoading={isSaving} disabled={!isValid} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, flexGrow: 1, backgroundColor: Colors.gray50 },
})
