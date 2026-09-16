import { Pressable, Text, View } from 'react-native';
import { Field, SubmitButton } from '../../components/auth';
import { styles } from '../../styles/authStyles';

export default function RegisterScreen({ form, setForm, errors, apiError, loading, onSubmit, goTo }) {
  const update = (key) => (value) => setForm({ ...form, [key]: value });
  return <>
    <View style={styles.titleRow}><Text style={styles.title}>Crea tu</Text><Text style={styles.titleAccent}>cuenta</Text></View>
    <Text style={styles.subtitle}>Regístrate para acceder a los servicios de Jenna Car.</Text>
    <Field label="Nombre" value={form.nombre} onChangeText={update('nombre')} error={errors.nombre} autoComplete="name-given" />
    <Field label="Apellido" value={form.apellido} onChangeText={update('apellido')} error={errors.apellido} autoComplete="name-family" />
    <Field label="Teléfono" value={form.telefono} onChangeText={update('telefono')} error={errors.telefono} autoComplete="tel" numeric />
    <Field label="Correo electrónico" value={form.email} onChangeText={update('email')} error={errors.email} autoComplete="email" />
    <Field label="Contraseña" value={form.password} onChangeText={update('password')} error={errors.password} secureTextEntry showToggle autoComplete="new-password" />
    <Field label="Confirmar contraseña" value={form.confirmPassword} onChangeText={update('confirmPassword')} error={errors.confirmPassword} secureTextEntry showToggle autoComplete="new-password" />
    {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}
    <Text style={styles.termsText}>Al registrarte, aceptas nuestros{' '}<Text style={styles.link}>Términos de Servicio</Text>{' '}y{' '}<Text style={styles.link}>Política de Privacidad</Text>.</Text>
    <SubmitButton title="Registrarse →" loading={loading} onPress={onSubmit} />
    <View style={styles.footerRow}><Text style={styles.footerText}>¿Ya tienes cuenta? </Text><Pressable onPress={() => goTo('login')}><Text style={styles.link}>Iniciar sesión</Text></Pressable></View>
  </>;
}
