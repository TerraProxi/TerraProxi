import { Share } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import api from './api'

const EXPORT_FILE_NAME = 'terraproxi-mes-donnees.json'

/**
 * RGPD — droit d'accès et à la portabilité : télécharge GET /users/me/export et
 * propose de l'enregistrer ou de l'envoyer via la feuille de partage du système.
 */
export async function shareMyDataExport(): Promise<void> {
  const { data } = await api.get<unknown>('/users/me/export')
  const json = JSON.stringify(data, null, 2)

  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    await Share.share({ title: 'Mes données TerraProxi', message: json })
    return
  }
  const fileUri = `${FileSystem.cacheDirectory}${EXPORT_FILE_NAME}`
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 })
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Exporter mes données',
  })
}
