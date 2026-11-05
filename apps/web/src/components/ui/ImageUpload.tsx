import { useRef, useState, type ChangeEvent } from 'react'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadsService } from '../../services/uploads.service'
import { apiErrorMessage, apiErrorStatus } from '../../services/api'

interface Props {
  /** Préfixe des identifiants (plusieurs envois possibles sur une page). */
  id: string
  label: string
  /** URL actuelle de la photo, affichée en aperçu. */
  value: string
  onUploaded: (url: string) => void
}

const ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')
const MAX_SIZE_LABEL = `${MAX_IMAGE_BYTES / 1024 / 1024} Mo`

function uploadErrorMessage(err: unknown): string {
  switch (apiErrorStatus(err)) {
    case 413: return `Photo trop lourde : ${MAX_SIZE_LABEL} au maximum.`
    case 400: return apiErrorMessage(err, 'Format non pris en charge : JPEG, PNG ou WebP uniquement.')
    default: return apiErrorMessage(err, 'Envoi de la photo impossible')
  }
}

/** CAT-1 — envoi d'une photo (POST /uploads) avec aperçu ; l'URL obtenue remplit le champ du formulaire. */
export function ImageUpload({ id, label, value, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStatus('')
    // Contrôle immédiat pour éviter un envoi voué à l'échec ; le serveur revérifie le contenu
    if (!ACCEPTED_IMAGE_TYPES.some((type) => type === file.type)) {
      setError('Format non pris en charge : JPEG, PNG ou WebP uniquement.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Photo trop lourde : ${MAX_SIZE_LABEL} au maximum.`)
      return
    }
    setIsUploading(true)
    try {
      const { data } = await uploadsService.upload(file)
      onUploaded(data.url)
      setStatus('Photo envoyée')
    } catch (err) {
      setError(uploadErrorMessage(err))
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const inputId = `${id}-fichier`
  const hintId = `${id}-aide`
  const errorId = `${id}-erreur`

  return (
    <div className="tp-field">
      <label htmlFor={inputId} className="tp-label">{label}</label>
      <div className="tp-upload">
        {value ? (
          <img src={value} alt="Aperçu de la photo actuelle" className="tp-upload__preview" />
        ) : (
          <div className="tp-upload__preview" aria-hidden="true">📷</div>
        )}
        <div className="tp-stack" style={{ gap: 'var(--space-1)', flex: 1, minWidth: 0 }}>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            disabled={isUploading}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? true : undefined}
            onChange={handleFile}
          />
          <span id={hintId} className="tp-hint">JPEG, PNG ou WebP, {MAX_SIZE_LABEL} maximum.</span>
          <span role="status" className="tp-small">{isUploading ? 'Envoi en cours…' : status}</span>
          {error && <span id={errorId} className="tp-field-error" role="alert">{error}</span>}
        </div>
      </div>
    </div>
  )
}
