import { post } from './client';

export function login({ email, password }) {
  return post('/api/auth/login', { email, password });
}

export function register({ nombre, apellido, telefono, email, password }) {
  return post('/api/auth/register', { nombre, apellido, telefono, email, password });
}

export function loginWithGoogle(idToken) {
  return post('/api/auth/google', { id_token: idToken });
}

export function requestPasswordReset(email) {
  return post('/api/auth/password-reset/request', { email });
}

export function confirmPasswordReset({ email, code, password }) {
  return post('/api/auth/password-reset/confirm', { email, code, password });
}
