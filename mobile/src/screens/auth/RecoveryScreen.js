import { Pressable, Text, View } from 'react-native';
import { Field, SubmitButton } from '../../components/auth';
import { styles } from '../../styles/authStyles';

export default function RecoveryScreen({ form, setForm, errors, apiError, message, loading, onRequest, onConfirm, goTo }) {
  const update = (key) => (value) => setForm({ ...form, [key]: value });
  return <>
    <View style={styles.titleRow}><Text style={styles.title}>Recuperar</Text><Text style={styles.titleAccent}>contraseña</Text></View>
    <Text style={styles.subtitle}>{form.requested ? 'Ingresa el código que enviamos a tu correo y elige una nueva contraseña.' : 'Te enviaremos un código de recuperación a tu correo electrónico.'}</Text>
    <Field label="Correo electrónico" value={form.email} onChangeText={update('email')} error={errors.email} autoComplete="email" />
    {form.requested && <>
      <Field label="Código de recuperación" value={form.code} onChangeText={update('code')} error={errors.code} autoComplete="one-time-code" />
      <Field label="Nueva contraseña" value={form.password} onChangeText={update('password')} error={errors.password} secureTextEntry showToggle autoComplete="new-password" />
      <Field label="Confirmar nueva contraseña" value={form.confirmPassword} onChangeText={update('confirmPassword')} error={errors.confirmPassword} secureTextEntry showToggle autoComplete="new-password" />
    </>}
    {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}
    {message ? <View style={styles.notice}><Text selectable style={styles.noticeText}>{message}</Text></View> : null}
    <SubmitButton title={form.requested ? 'Actualizar contraseña' : 'Enviar código'} loading={loading} onPress={form.requested ? onConfirm : onRequest} />
    {form.requested && <Pressable onPress={() => setForm({ ...form, requested: false, code: '', password: '', confirmPassword: '' })} style={styles.textButton}><Text style={styles.link}>Usar otro correo</Text></Pressable>}
    <Pressable onPress={() => goTo('login')} style={styles.backBtn}><Text style={styles.backBtnText}>← Volver al inicio de sesión</Text></Pressable>
  </>;
}
