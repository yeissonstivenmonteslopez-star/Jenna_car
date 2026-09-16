import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const ERROR_MESSAGE = 'No fue posible iniciar sesión con Google. Inténtalo de nuevo.';

export default function useGoogleAuth() {
  const configured = Boolean(Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  }));

  const [request, response, prompt] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'missing-google-client-id',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'missing-google-client-id',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-google-client-id',
    selectAccount: true,
  });

  const [result, setResult] = useState(null);
  const processedToken = useRef('');

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      setResult({ type: 'error', message: ERROR_MESSAGE });
      return;
    }
    if (response.type !== 'success') return;
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) {
      setResult({ type: 'error', message: 'No fue posible obtener el token de Google.' });
      return;
    }
    if (processedToken.current === idToken) return;
    processedToken.current = idToken;
    setResult({ type: 'id_token', idToken });
  }, [response]);

  const reset = () => setResult(null);

  const start = async () => {
    reset();
    if (!configured) return { error: 'El acceso con Google aún no está configurado en esta app.' };
    if (!request) return { error: 'El acceso con Google se está preparando. Inténtalo de nuevo en unos segundos.' };
    try {
      await prompt();
      return {};
    } catch {
      return { error: ERROR_MESSAGE };
    }
  };

  return { configured, request, result, reset, start };
}