import api from './api'

/** Contraintes de specs/api/uploads-api.yaml (le serveur revérifie le contenu du fichier). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

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
