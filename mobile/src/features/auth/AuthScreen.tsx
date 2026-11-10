import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Copy, ErrorText, Input, Page } from '../../components/ui';
import { request } from '../../api/http';
import type { Session } from '../../types/models';
import { useAuth } from './store';
import type { AuthRoutes } from '../../app/routes';
import useGoogleAuth from './useGoogleAuth';
import { useEffect } from 'react';

export default function AuthScreen({ route, navigation }: NativeStackScreenProps<AuthRoutes>) {
  const register = route.name === 'Registro'; const recovery = route.name === 'Recuperar';
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', email: '', password: '', confirm: '', code: '' });
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const enter = useAuth(s => s.enter); const google = useGoogleAuth();
  const field = (key: keyof typeof form, title: string, maxLength?: number) => <Input key={key} label={title} value={form[key]} maxLength={maxLength} autoCapitalize={key === 'nombre' || key === 'apellido' ? 'words' : 'none'} keyboardType={key === 'email' ? 'email-address' : key === 'telefono' || key === 'code' ? 'number-pad' : 'default'} secureTextEntry={key === 'password' || key === 'confirm'} onChangeText={value => setForm(current => ({ ...current, [key]: value }))} />;
  useEffect(() => {
    if (!google.result) return;
    const outcome = google.result; google.reset();
    if (outcome.type === 'error') { setError(outcome.message); return; }
    setBusy(true);
    request<Session>('/api/auth/google', 'POST', { id_token: outcome.idToken }, false).then(enter).catch(e => setError(e.message)).finally(() => setBusy(false));
  }, [google.result, enter]);
  async function submit() {
    setError(''); setNotice('');
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) return setError('Ingresa un correo válido de hasta 150 caracteres.');
    if ((!recovery || sent) && !form.password) return setError('Ingresa tu contraseña.');
    if ((register || (recovery && sent)) && (form.password.length < 8 || form.password !== form.confirm)) return setError('Usa al menos 8 caracteres y confirma la misma contraseña.');
    if (register && (!form.nombre.trim() || !form.apellido.trim() || !/^\d{10}$/.test(form.telefono))) return setError('Nombre, apellido y teléfono de 10 dígitos son obligatorios.');
    if (recovery && sent && !/^\d{6}$/.test(form.code)) return setError('Ingresa el código de 6 dígitos.');
    setBusy(true);
    try {
      if (register) {
        await request('/api/auth/register', 'POST', { nombre: form.nombre.trim(), apellido: form.apellido.trim(), telefono: form.telefono, email, password: form.password }, false);
        setNotice('Cuenta creada. Ya puedes iniciar sesión.'); navigation.navigate('Login');
      } else if (recovery) {
        const response = await request<{ message?: string }>(`/api/auth/password-reset/${sent ? 'confirm' : 'request'}`, 'POST', sent ? { email, code: form.code, password: form.password } : { email }, false);
        if (sent) { navigation.navigate('Login'); setNotice('Contraseña actualizada.'); }
        else { setSent(true); setNotice(response.message || 'Revisa tu correo.'); }
      } else await enter(await request<Session>('/api/auth/login', 'POST', { email, password: form.password }, false));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo continuar.'); }
    finally { setBusy(false); }
  }
  return <Page title="JENNA / CAR" subtitle="Tu taller, siempre contigo"><Card><Copy large>{register ? 'Crear cuenta' : recovery ? 'Recuperar acceso' : 'Bienvenido de vuelta'}</Copy>{register && <>{field('nombre', 'Nombre', 100)}{field('apellido', 'Apellido', 100)}{field('telefono', 'Teléfono', 10)}</>}{field('email', 'Correo electrónico', 150)}{(!recovery || sent) && field('password', recovery ? 'Nueva contraseña' : 'Contraseña')}{(register || (recovery && sent)) && field('confirm', 'Confirmar contraseña')}{recovery && sent && field('code', 'Código de recuperación', 6)}{error && <ErrorText message={error} />}{notice && <Copy>{notice}</Copy>}<Button busy={busy} title={register ? 'Crear cuenta' : recovery ? sent ? 'Guardar contraseña' : 'Enviar código' : 'Iniciar sesión'} onPress={() => void submit()} />{route.name === 'Login' && <><Button secondary title="Continuar con Google" disabled={!google.configured || !google.request || busy} onPress={() => { void google.start().then(result => { if (result.error) setError(result.error); }); }} /><Button secondary title="Crear cuenta" onPress={() => navigation.navigate('Registro')} /><Button secondary title="Olvidé mi contraseña" onPress={() => navigation.navigate('Recuperar')} /></>}{route.name !== 'Login' && <Button secondary title="Volver al inicio de sesión" onPress={() => navigation.navigate('Login')} />}</Card></Page>;
}
