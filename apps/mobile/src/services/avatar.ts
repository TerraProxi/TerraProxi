import * as ImagePicker from 'expo-image-picker'
import api from './api'
import type { User } from '../store/auth.store'

/** specs/api/uploads-api.yaml#/components/schemas/Upload */
interface Upload {
  url: string
  content_type: 'image/jpeg' | 'image/png' | 'image/webp'
  size_bytes: number
}

const AVATAR_QUALITY = 0.7

/**
 * Photo de profil : choix dans la galerie (sélecteur système, sans permission sur iOS 14+
 * et Android 13+), envoi POST /uploads (multipart, champ `file`), puis
 * PATCH /users/profile { avatar_url }. Renvoie null si l'utilisateur annule.
 */
export async function pickAndUploadAvatar(): Promise<User | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: AVATAR_QUALITY,
  })
  if (result.canceled) return null

  const asset = result.assets[0]
  const form = new FormData()
  // Format attendu par le FormData de React Native pour un fichier local
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName ?? 'photo-profil.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  } as unknown as Blob)

  const { data: upload } = await api.post<Upload>('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (body: unknown) => body,
  })
  const { data: user } = await api.patch<User>('/users/profile', { avatar_url: upload.url })
  return user
}
