/**
 * CAT-1 — Envoi de photos (produits, bannière, avatar).
 * POST multipart → URL publique à enregistrer dans image_url / banner_url / avatar_url.
 */
import { Elysia, t } from 'elysia'
import { authGuard } from '../middlewares/auth.middleware'
import { db } from '../db/client'
import { AppError, badRequest, notFound } from '../utils/errors'
import { rateLimits } from '../utils/rate-limit'
import { publicOrigin } from '../utils/request'
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_FILENAME_PATTERN,
  contentTypeOf,
  detectImageType,
  storeImage,
  uploadPath,
} from '../services/upload-storage'

const ONE_YEAR_SECONDS = 31_536_000
const filenameRegex = new RegExp(UPLOAD_FILENAME_PATTERN)

export const uploadsRoutes = new Elysia({ prefix: '/uploads' })

  /** GET /api/uploads/:filename — fichier immuable (nom aléatoire), mis en cache un an. */
  .get(
    '/:filename',
    async ({ params }) => {
      if (!filenameRegex.test(params.filename)) throw notFound('Fichier')
      const file = Bun.file(uploadPath(params.filename))
      if (!(await file.exists())) throw notFound('Fichier')
      return new Response(file, {
        headers: {
          'content-type': contentTypeOf(params.filename),
          'cache-control': `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'",
        },
      })
    },
    {
      params: t.Object({ filename: t.String({ maxLength: 100 }) }),
      detail: { summary: 'Télécharger une photo', tags: ['Uploads'] },
    },
  )

  .use(authGuard())

  .post(
    '/',
    async ({ body, user, request, set }) => {
      rateLimits.uploadsPerUser.hit(user.sub)
      const { file } = body
      if (file.size > MAX_UPLOAD_BYTES) throw new AppError(413, 'Photo trop lourde : 5 Mo maximum')

      const bytes = new Uint8Array(await file.arrayBuffer())
      const type = detectImageType(bytes)
      if (!type) throw badRequest('Format non pris en charge : JPEG, PNG ou WebP uniquement')

      const filename = await storeImage(bytes, type)
      await db.query(
        'INSERT INTO uploads (user_id, filename, content_type, size_bytes) VALUES ($1, $2, $3, $4)',
        [user.sub, filename, type.contentType, bytes.byteLength],
      )
      set.status = 201
      return {
        url: `${publicOrigin(request)}/api/uploads/${filename}`,
        content_type: type.contentType,
        size_bytes: bytes.byteLength,
      }
    },
    {
      body: t.Object({ file: t.File() }),
      detail: { summary: 'Envoyer une photo', tags: ['Uploads'] },
    },
  )
