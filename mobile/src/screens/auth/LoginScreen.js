import { Pressable, Text, View } from 'react-native';
import { Divider, Field, GoogleButton, SubmitButton } from '../../components/auth';
import { styles } from '../../styles/authStyles';

export default function LoginScreen({ form, setForm, errors, apiError, message, loading, onSubmit, onGoogleLogin, googleReady, goTo }) {
  return <>
    <View style={styles.titleRow}><Text style={styles.title}>Bienvenido</Text><Text style={styles.titleAccent}>de vuelta</Text></View>
    <Text style={styles.subtitle}>Ingresa a tu cuenta para gestionar tu vehículo.</Text>
    <Field label="Correo electrónico" value={form.email} onChangeText={(email) => setForm({ ...form, email })} error={errors.email} autoComplete="email" />
    <Field label="Contraseña" value={form.password} onChangeText={(password) => setForm({ ...form, password })} error={errors.password} secureTextEntry showToggle autoComplete="password" />
    <Pressable onPress={() => goTo('recovery')} style={styles.forgotWrapper}><Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text></Pressable>
    {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}
    {message ? <Text selectable style={styles.noticeText}>{message}</Text> : null}
    <SubmitButton title="Iniciar sesión" loading={loading} onPress={onSubmit} />
    <Divider />
    <GoogleButton onPress={onGoogleLogin} disabled={loading || !googleReady} />
    <View style={styles.footerRow}><Text style={styles.footerText}>¿Aún no tienes cuenta? </Text><Pressable onPress={() => goTo('register')}><Text style={styles.link}>Crear cuenta</Text></Pressable></View>
  </>;
}
