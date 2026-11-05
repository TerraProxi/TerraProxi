import { t } from 'elysia'

/**
 * URL publique saisie par un utilisateur (photo, site web, bannière, avatar).
 * Seuls http(s) sont acceptés : `javascript:` ou `data:` ouvriraient une faille XSS
 * stockée dans les applications. La chaîne vide est tolérée (champ effacé).
 */
export const HTTP_URL_PATTERN = '^(https?://[^\\s<>"]+)?$'

export const httpUrl = () => t.String({ maxLength: 500, pattern: HTTP_URL_PATTERN })

/** '' ou espaces → null ; sinon la valeur sans espaces superflus. */
export const emptyToNull = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
