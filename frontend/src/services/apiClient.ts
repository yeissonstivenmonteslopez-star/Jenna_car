export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()

  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return 'http://localhost:5000'
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || ''
}

export function getStoredToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('jenna_car_token') || ''
}

export function authHeaders(token?: string): Record<string, string> {
  const storedToken = token ?? getStoredToken()
  return storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
}

export async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({} as Record<string, unknown>)) as Promise<Record<string, unknown>>
}

export class ApiError extends Error {
  status: number
  payload: Record<string, unknown>

  constructor(message: string, status: number, payload: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

// API payloads vary by endpoint and are narrowed by each consumer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleResponse<T = any>(res: Response, fallbackMessage: string): Promise<T> {
  const body = (await parseJsonSafe(res)) as T & { error?: string }
  if (!res.ok) {
    const message = (body as { error?: string }).error || fallbackMessage
    throw new ApiError(message, res.status, body as Record<string, unknown>)
  }
  return body as T
}

export function buildApiUrl(path: string): string {
  return getApiUrl(path)
}

export function buildAssetUrl(assetPath: string | null | undefined): string {
  if (!assetPath) return ''
  if (/^https?:\/\//i.test(assetPath)) return assetPath
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return getApiUrl(normalized)
}
