import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY = 'jenna_car_auth_token';
export const loadToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const saveToken = (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token);
export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
