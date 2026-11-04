/**
 * Chargement des contrats de specs/ pour les tests de conformité.
 *
 * - specs/api/*.yaml : opérations OpenAPI (chemins, codes, schémas de réponse)
 * - specs/schemas/*.json, specs/contracts/error-envelope.schema.json : JSON Schemas référencés
 *
 * assertResponseConforms() vérifie qu'une réponse de l'API est documentée (code HTTP présent
 * dans la spec) et que son corps respecte le schéma déclaré, champs en trop compris.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { parse } from 'yaml'

const SPECS_DIR = resolve(import.meta.dir, '../../../../specs')
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

type Json = Record<string, any>

export interface SpecOperation {
  method: string
  /** Chemin de la spec, sans préfixe /api (ex. /orders/{id}/status) */
  path: string
  file: string
  operation: Json
  doc: Json
}

const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)

const schemaFiles = [
  ...readdirSync(join(SPECS_DIR, 'schemas')).filter((f) => f.endsWith('.json')).map((f) => join(SPECS_DIR, 'schemas', f)),
  join(SPECS_DIR, 'contracts', 'error-envelope.schema.json'),
]
for (const file of schemaFiles) ajv.addSchema(JSON.parse(readFileSync(file, 'utf-8')))

export const specOperations: SpecOperation[] = readdirSync(join(SPECS_DIR, 'api'))
  .filter((f) => f.endsWith('.yaml'))
  .flatMap((file) => {
    const doc = parse(readFileSync(join(SPECS_DIR, 'api', file), 'utf-8')) as Json
    return Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
      HTTP_METHODS.filter((m) => (item as Json)[m]).map((m) => ({
        method: m.toUpperCase(),
        path,
        file,
        operation: (item as Json)[m],
        doc,
      })),
    )
  })

function resolveLocalRef(doc: Json, ref: string): Json {
  return ref.slice(2).split('/').reduce((node: Json, key) => node?.[key], doc)
}

/**
 * Transforme un nœud OpenAPI en JSON Schema autonome pour Ajv : les références locales
 * (#/components/…) sont remplacées par leur contenu, les fichiers externes par leur $id.
 */
function toAjvSchema(doc: Json, node: unknown): unknown {
  if (Array.isArray(node)) return node.map((n) => toAjvSchema(doc, n))
  if (!node || typeof node !== 'object') return node
  const obj = node as Json
  if (typeof obj.$ref === 'string') {
    if (obj.$ref.startsWith('#/')) return toAjvSchema(doc, resolveLocalRef(doc, obj.$ref))
    const [file, fragment] = obj.$ref.split('#')
    return { $ref: fragment ? `${basename(file)}#${fragment}` : basename(file) }
  }
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toAjvSchema(doc, v)]))
}

function templateToRegex(path: string): RegExp {
  return new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`)
}

/** Trouve l'opération de la spec correspondant à une requête concrète. */
export function findOperation(method: string, requestPath: string): SpecOperation | undefined {
  const path = requestPath.split('?')[0].replace(/^\/api(?=\/)/, '')
  const candidates = specOperations.filter((op) => op.method === method && templateToRegex(op.path).test(path))
  // Les chemins statiques (/products/mine) priment sur les paramètres (/products/{id})
  return candidates.sort((a, b) => a.path.split('{').length - b.path.split('{').length)[0]
}

const validators = new Map<string, ValidateFunction | null>()

function responseValidator(op: SpecOperation, status: string): ValidateFunction | null {
  const key = `${op.method} ${op.path} ${status}`
  if (!validators.has(key)) {
    let response = op.operation.responses?.[status] as Json | undefined
    if (response?.$ref) response = resolveLocalRef(op.doc, response.$ref)
    const schema = response?.content?.['application/json']?.schema
    validators.set(key, schema ? ajv.compile(toAjvSchema(op.doc, schema) as object) : null)
  }
  return validators.get(key) ?? null
}

/** Lève une erreur si la réponse n'est pas décrite par la spec. */
export function assertResponseConforms(method: string, requestPath: string, status: number, body: unknown) {
  const op = findOperation(method, requestPath)
  if (!op) throw new Error(`Spec : aucune opération ${method} ${requestPath} dans specs/api`)
  if (!op.operation.responses?.[String(status)]) {
    throw new Error(`Spec : ${method} ${op.path} (${op.file}) ne documente pas le code ${status}`)
  }
  const validate = responseValidator(op, String(status))
  if (validate && !validate(body)) {
    const detail = ajv.errorsText(validate.errors, { separator: '\n  ' })
    throw new Error(`Spec : réponse ${status} de ${method} ${op.path} non conforme (${op.file})\n  ${detail}\n  corps : ${JSON.stringify(body).slice(0, 500)}`)
  }
}
