import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY } from '../constants/auth';

export function loadToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function saveToken(token) {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function deleteToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}