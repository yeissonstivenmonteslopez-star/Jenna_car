const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function post(path, body) {
  if (!baseUrl) {
    throw new ApiError('Falta configurar EXPO_PUBLIC_API_URL. Consulta .env.example.');
  }

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Revisa la URL y tu conexión.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || data.message || 'La solicitud no pudo completarse.', response.status);
  }
  return data;
}
