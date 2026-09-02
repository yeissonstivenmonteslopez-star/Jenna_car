export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim()

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
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || ''
}
