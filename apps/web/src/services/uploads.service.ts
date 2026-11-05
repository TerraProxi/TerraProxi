import api from './api'

/** Contraintes de specs/api/uploads-api.yaml (le serveur revérifie le contenu du fichier). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const MAX_IMAGE_SIZE_LABEL = `${MAX_IMAGE_BYTES / 1024 / 1024} Mo`

/** Contrôle avant envoi (évite un aller-retour voué à l'échec) ; null si le fichier est acceptable. */
export function validateImageFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ACCEPTED_IMAGE_TYPES.some((type) => type === file.type)) {
    return 'Format non pris en charge : JPEG, PNG ou WebP uniquement.'
  }
  if (file.size > MAX_IMAGE_BYTES) return `Photo trop lourde : ${MAX_IMAGE_SIZE_LABEL} au maximum.`
  return null
}

export interface UploadedImage {
  url: string
  content_type: (typeof ACCEPTED_IMAGE_TYPES)[number]
  size_bytes: number
}

/** L'envoi d'une photo peut être lent sur une connexion mobile. */
const UPLOAD_TIMEOUT_MS = 60_000

export const uploadsService = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    // Sans cet en-tête, axios sérialiserait le FormData en JSON (Content-Type JSON par défaut de l'instance) ;
    // il le retire ensuite pour laisser le navigateur poser la frontière multipart.
    return api.post<UploadedImage>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    })
  },
}
