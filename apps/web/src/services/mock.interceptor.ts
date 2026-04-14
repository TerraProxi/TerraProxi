import type { AxiosInstance } from 'axios'
import { MOCK_PRODUCERS, MOCK_PRODUCTS } from './mock.data'

function matchPath(url: string, pattern: string): Record<string, string> | null {
  const urlParts = url.split('/').filter(Boolean)
  const patternParts = pattern.split('/').filter(Boolean)
  if (urlParts.length !== patternParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i]
    } else if (patternParts[i] !== urlParts[i]) {
      return null
    }
  }
  return params
}

function getSearchParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return {}
  const searchParams = new URLSearchParams(url.slice(queryIndex + 1))
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}

function getBaseUrl(url: string): string {
  const queryIndex = url.indexOf('?')
  return queryIndex === -1 ? url : url.slice(0, queryIndex)
}

function handleMockRequest(url: string): { data: unknown; status: number } | null {
  const baseUrl = getBaseUrl(url)
  const params = getSearchParams(url)

  const producerByIdMatch = matchPath(baseUrl, '/producers/:id')
  if (producerByIdMatch) {
    const producer = MOCK_PRODUCERS.find((p) => p.id === producerByIdMatch.id)
    if (producer) return { data: producer, status: 200 }
    return { data: null, status: 404 }
  }

  const producersListMatch = matchPath(baseUrl, '/producers')
  if (producersListMatch) {
    let results = [...MOCK_PRODUCERS]
    if (params.search) {
      const q = params.search.toLowerCase()
      results = results.filter((p) => p.company_name.toLowerCase().includes(q))
    }
    if (params.limit) {
      results = results.slice(0, Number(params.limit))
    }
    return { data: results, status: 200 }
  }

  const productByIdMatch = matchPath(baseUrl, '/products/:id')
  if (productByIdMatch) {
    const product = MOCK_PRODUCTS.find((p) => p.id === productByIdMatch.id)
    if (product) return { data: product, status: 200 }
    return { data: null, status: 404 }
  }

  const productsListMatch = matchPath(baseUrl, '/products')
  if (productsListMatch) {
    let results = [...MOCK_PRODUCTS]
    if (params.producer_id) {
      results = results.filter((p) => p.producer_id === params.producer_id)
    }
    if (params.available === 'true') {
      results = results.filter((p) => p.is_available)
    }
    if (params.search) {
      const q = params.search.toLowerCase()
      results = results.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (params.limit) {
      results = results.slice(0, Number(params.limit))
    }
    return { data: results, status: 200 }
  }

  return null
}

export function setupMockInterceptor(api: AxiosInstance) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ERR_NETWORK') {
        const url = error.config?.url ?? ''
        const mockResult = handleMockRequest(url)
        if (mockResult) {
          return Promise.resolve(mockResult)
        }
      }
      return Promise.reject(error)
    },
  )
}
