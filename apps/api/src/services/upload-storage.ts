import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { log } from '../utils/logger'

/**
 * Stockage des photos sur disque (UPLOAD_DIR, volume Docker en production).
 * Le type est déduit des premiers octets du fichier, jamais de son nom ni de
 * l'en-tête envoyé par le client : un script renommé en .jpg est refusé.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const UPLOAD_FILENAME_PATTERN = '^[0-9a-f-]{36}\\.(jpg|png|webp)$'

const IMAGE_SIGNATURES = [
  { contentType: 'image/jpeg', extension: 'jpg', matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    contentType: 'image/png',
    extension: 'png',
    matches: (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => b[i] === byte),
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    matches: (b: Uint8Array) =>
      String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  },
] as const

export type ImageType = (typeof IMAGE_SIGNATURES)[number]

export function uploadDir(): string {
  return resolve(process.env.UPLOAD_DIR ?? resolve(import.meta.dir, '../../uploads'))
}

export function detectImageType(bytes: Uint8Array): ImageType | null {
  return IMAGE_SIGNATURES.find((signature) => signature.matches(bytes)) ?? null
}

export const contentTypeOf = (filename: string): string =>
  IMAGE_SIGNATURES.find((s) => filename.endsWith(`.${s.extension}`))?.contentType ?? 'application/octet-stream'

export async function storeImage(bytes: Uint8Array, type: ImageType): Promise<string> {
  const filename = `${crypto.randomUUID()}.${type.extension}`
  await mkdir(uploadDir(), { recursive: true })
  await writeFile(join(uploadDir(), filename), bytes)
  return filename
}

export const uploadPath = (filename: string) => join(uploadDir(), filename)

/** Suppression au mieux : un fichier déjà absent n'est pas une erreur. */
export async function deleteImages(filenames: string[]): Promise<void> {
  for (const filename of filenames) {
    try {
      await unlink(uploadPath(filename))
    } catch (err) {
      if ((err as { code?: string }).code !== 'ENOENT') log.warn('upload deletion failed', { filename, err })
    }
  }
}
