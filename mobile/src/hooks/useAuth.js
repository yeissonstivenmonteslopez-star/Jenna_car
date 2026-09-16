import { useEffect, useState } from 'react';

import { confirmPasswordReset, login, loginWithGoogle, register, requestPasswordReset } from '../api/auth';
import { emptyLogin, emptyRecovery, emptyRegister } from '../constants/auth';
import { deleteToken, loadToken, saveToken } from '../services/session';
import { validateLogin, validateRecoveryConfirm, validateRegister } from '../utils/validation';
import useGoogleAuth from './useGoogleAuth';

export default function useAuth() {
  const [screen, setScreen] = useState('login');
  const [loginForm, setLoginForm] = useState(emptyLogin);
  const [registerForm, setRegisterForm] = useState(emptyRegister);
  const [recoveryForm, setRecoveryForm] = useState(emptyRecovery);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [hydrating, setHydrating] = useState(true);
  const google = useGoogleAuth();

  useEffect(() => {
    loadToken()
      .then((token) => { if (token) setScreen('home'); })
      .finally(() => setHydrating(false));
  }, []);

  useEffect(() => {
    if (!google.result) return;
    if (google.result.type === 'error') {
      setApiError(google.result.message);
      google.reset();
      return;
    }
    handleGoogleIdToken(google.result.idToken).finally(() => google.reset());
  }, [google.result]);

  const enterSession = async (data) => {
    await saveToken(data.token);
    setUser(data.user || null);
    setScreen('home');
  };

  const goTo = (nextScreen) => {
    setScreen(nextScreen);
    setErrors({});
    setApiError('');
    setRecoveryMessage('');
  };

  const handleGoogleIdToken = async (idToken) => {
    setLoading(true); setApiError('');
    try {
      await enterSession(await loginWithGoogle(idToken));
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setApiError('');
    const outcome = await google.start();
    if (outcome?.error) setApiError(outcome.error);
  };

  const handleLogin = async () => {
    const nextErrors = validateLogin(loginForm);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await enterSession(await login(loginForm));
      setLoginForm(emptyLogin);
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    const nextErrors = validateRegister(registerForm);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await register({ nombre: registerForm.nombre.trim(), apellido: registerForm.apellido.trim(), telefono: registerForm.telefono.trim(), email: registerForm.email.trim(), password: registerForm.password });
      setRecoveryMessage('Registro exitoso. Ya puedes iniciar sesión.');
      setScreen('login');
      setRegisterForm(emptyRegister);
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handlePasswordResetRequest = async () => {
    const email = recoveryForm.email.trim();
    if (!email) return setErrors({ email: 'Ingresa tu correo electrónico.' });
    setErrors({}); setApiError(''); setRecoveryMessage(''); setLoading(true);
    try {
      const data = await requestPasswordReset(email);
      setRecoveryForm({ ...recoveryForm, email, code: '', requested: true });
      setRecoveryMessage(data.message || 'Revisa tu correo para obtener el código de recuperación.');
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handlePasswordResetConfirm = async () => {
    const nextErrors = validateRecoveryConfirm(recoveryForm);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setErrors({}); setApiError(''); setRecoveryMessage(''); setLoading(true);
    try {
      await confirmPasswordReset({ email: recoveryForm.email.trim(), code: recoveryForm.code.trim(), password: recoveryForm.password });
      setLoginForm({ email: recoveryForm.email.trim(), password: '' });
      setRecoveryForm(emptyRecovery);
      setScreen('login');
      setRecoveryMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handleSignOut = async () => {
    await deleteToken();
    setUser(null);
    goTo('login');
  };

  return {
    screen, loginForm, setLoginForm, registerForm, setRegisterForm, recoveryForm, setRecoveryForm,
    errors, apiError, recoveryMessage, loading, user, hydrating,
    googleConfigured: google.configured, googleRequest: google.request,
    goTo, handleGoogleLogin, handleLogin, handleRegister,
    handlePasswordResetRequest, handlePasswordResetConfirm, handleSignOut,
  };
}