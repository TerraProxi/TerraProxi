import { describe, expect, test } from 'bun:test'
import { createApp } from '../../src/app'
import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { specOperations } from './spec-contract'

const SPECS_API_DIR = resolvePath(import.meta.dir, '../../../../specs/api')

/** Charge '../schemas/x.schema.json#/$defs/Y' relativement à specs/api. */
function loadExternal(ref: string): Json {
  const [file, fragment] = ref.split('#')
  const schema = JSON.parse(readFileSync(resolvePath(SPECS_API_DIR, file), 'utf-8'))
  return (fragment ?? '').split('/').filter(Boolean).reduce((n: Json, k: string) => n?.[k], schema)
}

/**
 * Les routes de l'API et celles des specs OpenAPI doivent être exactement les mêmes,
 * avec les mêmes champs de corps et de paramètres de requête.
 */
type Json = Record<string, any>

const impl = await createApp().handle(new Request('http://localhost/swagger/json')).then((r) => r.json()) as Json

const normalize = (path: string) =>
  path.replace(/^\/api(?=\/)/, '').replace(/\{[^}]+\}/g, '{}').replace(/(.)\/$/, '$1')

/** Corps défini par un tiers et lu brut (signature) : non validé par Elysia. */
const EXTERNALLY_DEFINED_BODIES = new Set(['POST /stripe/webhook'])

const implOperations = Object.entries(impl.paths as Json)
  .filter(([path]) => !path.startsWith('/swagger'))
  .flatMap(([path, item]) =>
    Object.entries(item as Json)
      .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .map(([method, op]) => ({ key: `${method.toUpperCase()} ${normalize(path)}`, op: op as Json })),
  )

const specByKey = new Map(specOperations.map((op) => [`${op.method} ${normalize(op.path)}`, op]))

function resolve(doc: Json, node: Json | undefined): Json | undefined {
  if (!node?.$ref || !node.$ref.startsWith('#/')) return node
  return resolve(doc, node.$ref.slice(2).split('/').reduce((n: Json, k: string) => n?.[k], doc))
}

function implBodyFields(op: Json): string[] {
  const schema = op.requestBody?.content?.['application/json']?.schema
  return Object.keys(schema?.properties ?? {}).sort()
}

function specBodyFields(op: (typeof specOperations)[number]): string[] | null {
  const schema = op.operation.requestBody?.content?.['application/json']?.schema as Json | undefined
  if (!schema) return null
  const ref: string | undefined = schema.$ref
  const resolved = ref && !ref.startsWith('#/') ? loadExternal(ref) : resolve(op.doc, schema)
  return Object.keys(resolved?.properties ?? {}).sort()
}

const queryNames = (params: Json[] | undefined, doc?: Json) =>
  (params ?? []).map((p) => (doc ? resolve(doc, p) : p) as Json).filter((p) => p?.in === 'query').map((p) => p.name).sort()

describe('Conformité des routes avec specs/api', () => {
  test('chaque route implémentée est documentée', () => {
    expect(implOperations.map((o) => o.key).filter((k) => !specByKey.has(k))).toEqual([])
  })

  test('chaque route documentée est implémentée', () => {
    const implemented = new Set(implOperations.map((o) => o.key))
    expect([...specByKey.keys()].filter((k) => !implemented.has(k))).toEqual([])
  })

  test('aucune route n\'est décrite dans deux fichiers', () => {
    const keys = specOperations.map((op) => `${op.method} ${normalize(op.path)}`)
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([])
  })

  for (const { key, op } of implOperations) {
    const spec = specByKey.get(key)
    if (!spec) continue

    test(`${key} : mêmes paramètres de requête`, () => {
      const pathItemParams = spec.doc.paths[spec.path].parameters
      const specQuery = queryNames([...(pathItemParams ?? []), ...(spec.operation.parameters ?? [])], spec.doc)
      expect(specQuery).toEqual(queryNames(op.parameters))
    })

    const specFields = specBodyFields(spec)
    if (specFields && !EXTERNALLY_DEFINED_BODIES.has(key)) {
      test(`${key} : mêmes champs de corps`, () => {
        expect(specFields).toEqual(implBodyFields(op))
      })
    }
  }
})
