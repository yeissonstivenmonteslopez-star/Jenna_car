import { loadToken } from '../services/session';

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'ApiError'; }
}
let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler?: () => void) { onUnauthorized = handler; }
/** Solo GET se reintenta: una mutación nunca se duplica tras un fallo de red. */
export async function request<T>(path: string, method = 'GET', body?: unknown, authenticated = true): Promise<T> {
  if (!API_URL) throw new ApiError('Configura EXPO_PUBLIC_API_URL en mobile/.env.');
  const token = authenticated ? await loadToken() : null;
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const multipart = body instanceof FormData;
      const response = await fetch(`${API_URL}${path}`, {
        method, signal: controller.signal,
        headers: { Accept: 'application/json', ...(!multipart ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) {
        if (response.status === 401 && authenticated) onUnauthorized?.();
        throw new ApiError(data.error || data.message || 'No se pudo completar la solicitud.', response.status);
      }
      return data as T;
    } catch (error) {
      const retryable = !(error instanceof ApiError) || error.status >= 500;
      if (method === 'GET' && retryable && attempt < 2) {
        clearTimeout(timeout);
        await new Promise(resolve => setTimeout(resolve, 400 * 2 ** attempt));
        continue;
      }
      throw error instanceof ApiError ? error : new ApiError('No se pudo conectar. Comprueba tu conexión e intenta de nuevo.');
    } finally { clearTimeout(timeout); }
  }
}
export async function data<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return (await request<{ data: T }>(path, method, body)).data;
}
