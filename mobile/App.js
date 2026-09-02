import * as Google from 'expo-auth-session/providers/google';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as NavigationBar from 'expo-navigation-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Image,
} from 'react-native';

import { confirmPasswordReset, login, loginWithGoogle, register, requestPasswordReset } from './src/api/auth';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'jenna_car_auth_token';

const emptyLogin = { email: '', password: '' };
const emptyRegister = { nombre: '', apellido: '', telefono: '', email: '', password: '', confirmPassword: '' };
const emptyRecovery = { email: '', code: '', password: '', confirmPassword: '', requested: false };

// ─── Animated Field ────────────────────────────────────────────────────────────
function Field({ label, value, onChangeText, error, secureTextEntry, autoComplete = 'off', showToggle = false, numeric = false }) {
  const [hidden, setHidden] = useState(true);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  const onBlur  = () => Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? '#EF4444' : '#2C2C2E', error ? '#EF4444' : '#E5192A'],
  });

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.inputWrapper, { borderColor }]}>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(numeric ? text.replace(/\D/g, '').slice(0, 10) : text)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          keyboardType={numeric ? 'numeric' : label.toLowerCase().includes('correo') ? 'email-address' : 'default'}
          maxLength={numeric ? 10 : undefined}
          secureTextEntry={secureTextEntry && hidden}
          onFocus={onFocus}
          onBlur={onBlur}
          style={styles.input}
          placeholderTextColor="#555"
          accessibilityLabel={label}
        />
        {secureTextEntry && showToggle && (
          <Pressable onPress={() => setHidden(!hidden)} style={styles.eyeBtn} accessibilityLabel="Mostrar contraseña">
            <Text style={styles.eyeIcon}>{hidden ? '👁' : '🙈'}</Text>
          </Pressable>
        )}
      </Animated.View>
      {error ? <Text selectable style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Submit Button ─────────────────────────────────────────────────────────────
function SubmitButton({ title, loading, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={styles.buttonText}>{title}</Text>
        }
      </Pressable>
    </Animated.View>
  );
}

// ─── Google Button ─────────────────────────────────────────────────────────────
// El flujo usa Expo Auth Session + Google Identity para obtener el idToken,
// y luego lo envía al backend para validarlo y autenticar al usuario.
function GoogleButton({ onPress, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.googleButton, (pressed || disabled) && styles.buttonPressed]}
      >
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleButtonText}>Continuar con Google</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoBox}>
        <Image source={require('./assets/logo_car.jpg')} style={styles.logoImage} />
      </View>
      <View>
        <Text style={styles.brandBlack}>JENNA </Text>
      </View>
      <Text style={styles.brandRed}>CAR</Text>
    </View>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>o</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
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
  const processedGoogleToken = useRef('');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const setNavigationBar = () => {
      NavigationBar.setButtonStyleAsync('light');
    };
    setNavigationBar();
    const showSubscription = Keyboard.addListener('keyboardDidShow', setNavigationBar);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', setNavigationBar);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const googleConfigured = Boolean(Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  }));

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'missing-google-client-id',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'missing-google-client-id',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'missing-google-client-id',
    selectAccount: true,
  });

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((token) => { if (token) setScreen('home'); })
      .finally(() => setHydrating(false));
  }, []);

  const goTo = (nextScreen) => {
    setScreen(nextScreen);
    setErrors({});
    setApiError('');
    setRecoveryMessage('');
  };

  const completeGoogleLogin = async (idToken) => {
    setLoading(true); setApiError('');
    try {
      const data = await loginWithGoogle(idToken);
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      setUser(data.user || null);
      setScreen('home');
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'error') {
      setApiError('No fue posible iniciar sesión con Google. Inténtalo de nuevo.');
      return;
    }
    if (googleResponse.type !== 'success') return;

    const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      setApiError('No fue posible obtener el token de Google.');
      return;
    }
    if (processedGoogleToken.current === idToken) return;
    processedGoogleToken.current = idToken;
    completeGoogleLogin(idToken);
  }, [googleResponse]);


  const handleGoogleLogin = async () => {
    if (!googleConfigured) { setApiError('El acceso con Google aún no está configurado en esta app.'); return; }
    if (!googleRequest) { setApiError('El acceso con Google se está preparando. Inténtalo de nuevo en unos segundos.'); return; }
    setApiError('');
    try {
      await promptGoogle();
    } catch { setApiError('No fue posible iniciar sesión con Google. Inténtalo de nuevo.'); }
  };

  const handleLogin = async () => {
    const nextErrors = {};
    if (!loginForm.email.trim()) nextErrors.email = 'Ingresa tu correo electrónico.';
    if (!loginForm.password) nextErrors.password = 'Ingresa tu contraseña.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const data = await login(loginForm);
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      setUser(data.user || null);
      setScreen('home');
      setLoginForm(emptyLogin);
    } catch (error) { setApiError(error.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    const nextErrors = {};
    ['nombre', 'apellido', 'telefono', 'email', 'password'].forEach((key) => {
      if (!registerForm[key].trim()) nextErrors[key] = 'Este campo es obligatorio.';
    });
    if (registerForm.telefono && !/^\d{10}$/.test(registerForm.telefono.trim())) nextErrors.telefono = 'Ingresa exactamente 10 números.';
    if (registerForm.password && registerForm.password.length < 8) nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (registerForm.password !== registerForm.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await register({
        nombre: registerForm.nombre.trim(),
        apellido: registerForm.apellido.trim(),
        telefono: registerForm.telefono.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
      });
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
    const nextErrors = {};
    if (!recoveryForm.code.trim()) nextErrors.code = 'Ingresa el código recibido.';
    if (!recoveryForm.password) nextErrors.password = 'Ingresa una nueva contraseña.';
    if (recoveryForm.password && recoveryForm.password.length < 8) nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    if (recoveryForm.password !== recoveryForm.confirmPassword) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
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
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
    goTo('login');
  };

  if (hydrating) {
    return <View style={styles.splash}><ActivityIndicator size="large" color="#E5192A" /></View>;
  }

  if (screen === 'home') {
    return (
      <View style={styles.home}>
        <StatusBar style="light" />
        <View style={styles.homeLogoBox}><Image source={require('./assets/logo_car.jpg')} style={styles.homeLogoImage} /></View>
        <Text style={styles.homeWelcome}>
          {user ? `Bienvenido,` : 'Bienvenido'}
        </Text>
        {user && <Text style={styles.homeName}>{user.nombre} 👋</Text>}
        <Text style={styles.homeCopy}>Tu sesión está activa.</Text>
        <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutBtn, pressed && styles.buttonPressed]}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="light" />
        <View style={styles.card}>
          <Logo />
          {screen === 'login' && (
            <LoginView
              form={loginForm} setForm={setLoginForm}
              errors={errors} apiError={apiError} message={recoveryMessage}
              loading={loading} onSubmit={handleLogin}
              onGoogleLogin={handleGoogleLogin}
              googleReady={googleConfigured && Boolean(googleRequest)}
              goTo={goTo}
            />
          )}
          {screen === 'register' && (
            <RegisterView
              form={registerForm} setForm={setRegisterForm}
              errors={errors} apiError={apiError}
              loading={loading} onSubmit={handleRegister}
              goTo={goTo}
            />
          )}
          {screen === 'recovery' && (
            <RecoveryView
              form={recoveryForm} setForm={setRecoveryForm}
              errors={errors} apiError={apiError} message={recoveryMessage}
              loading={loading} onRequest={handlePasswordResetRequest}
              onConfirm={handlePasswordResetConfirm}
              goTo={goTo}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Login View ────────────────────────────────────────────────────────────────
function LoginView({ form, setForm, errors, apiError, message, loading, onSubmit, onGoogleLogin, googleReady, goTo }) {
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.titleAccent}>de vuelta</Text>
      </View>
      <Text style={styles.subtitle}>Ingresa a tu cuenta para gestionar tu vehículo.</Text>

      <Field label="Correo electrónico" value={form.email} onChangeText={(email) => setForm({ ...form, email })} error={errors.email} autoComplete="email" />
      <Field label="Contraseña" value={form.password} onChangeText={(password) => setForm({ ...form, password })} error={errors.password} secureTextEntry showToggle autoComplete="password" />

      <Pressable onPress={() => goTo('recovery')} style={styles.forgotWrapper}>
        <Text style={styles.forgotLink}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}
      {message  ? <Text selectable style={styles.noticeText}>{message}</Text>  : null}

      <SubmitButton title="Iniciar sesión" loading={loading} onPress={onSubmit} />
      <Divider />
      <GoogleButton onPress={onGoogleLogin} disabled={loading || !googleReady} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿Aún no tienes cuenta? </Text>
        <Pressable onPress={() => goTo('register')}><Text style={styles.link}>Crear cuenta</Text></Pressable>
      </View>
    </>
  );
}

// ─── Register View ─────────────────────────────────────────────────────────────
function RegisterView({ form, setForm, errors, apiError, loading, onSubmit, goTo }) {
  const update = (key) => (value) => setForm({ ...form, [key]: value });
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Crea tu</Text>
        <Text style={styles.titleAccent}>cuenta</Text>
      </View>
      <Text style={styles.subtitle}>Regístrate para acceder a los servicios de Jenna Car.</Text>

      <Field label="Nombre"              value={form.nombre}          onChangeText={update('nombre')}          error={errors.nombre}          autoComplete="name-given" />
      <Field label="Apellido"            value={form.apellido}        onChangeText={update('apellido')}        error={errors.apellido}        autoComplete="name-family" />
      <Field label="Teléfono"            value={form.telefono}        onChangeText={update('telefono')}        error={errors.telefono}        autoComplete="tel" numeric />
      <Field label="Correo electrónico"  value={form.email}           onChangeText={update('email')}           error={errors.email}           autoComplete="email" />
      <Field label="Contraseña"          value={form.password}        onChangeText={update('password')}        error={errors.password}        secureTextEntry showToggle autoComplete="new-password" />
      <Field label="Confirmar contraseña" value={form.confirmPassword} onChangeText={update('confirmPassword')} error={errors.confirmPassword} secureTextEntry showToggle autoComplete="new-password" />

      {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}

      <Text style={styles.termsText}>
        Al registrarte, aceptas nuestros{' '}
        <Text style={styles.link}>Términos de Servicio</Text>
        {' '}y{' '}
        <Text style={styles.link}>Política de Privacidad</Text>.
      </Text>

      <SubmitButton title="Registrarse →" loading={loading} onPress={onSubmit} />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <Pressable onPress={() => goTo('login')}><Text style={styles.link}>Iniciar sesión</Text></Pressable>
      </View>
    </>
  );
}

// ─── Recovery View ─────────────────────────────────────────────────────────────
function RecoveryView({ form, setForm, errors, apiError, message, loading, onRequest, onConfirm, goTo }) {
  const update = (key) => (value) => setForm({ ...form, [key]: value });
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Recuperar</Text>
        <Text style={styles.titleAccent}>contraseña</Text>
      </View>
      <Text style={styles.subtitle}>
        {form.requested
          ? 'Ingresa el código que enviamos a tu correo y elige una nueva contraseña.'
          : 'Te enviaremos un código de recuperación a tu correo electrónico.'}
      </Text>

      <Field label="Correo electrónico" value={form.email} onChangeText={update('email')} error={errors.email} autoComplete="email" />

      {form.requested && (
        <>
          <Field label="Código de recuperación"   value={form.code}            onChangeText={update('code')}            error={errors.code}            autoComplete="one-time-code" />
          <Field label="Nueva contraseña"          value={form.password}        onChangeText={update('password')}        error={errors.password}        secureTextEntry showToggle autoComplete="new-password" />
          <Field label="Confirmar nueva contraseña" value={form.confirmPassword} onChangeText={update('confirmPassword')} error={errors.confirmPassword} secureTextEntry showToggle autoComplete="new-password" />
        </>
      )}

      {apiError ? <Text selectable style={styles.apiError}>{apiError}</Text> : null}
      {message  ? <View style={styles.notice}><Text selectable style={styles.noticeText}>{message}</Text></View> : null}

      <SubmitButton
        title={form.requested ? 'Actualizar contraseña' : 'Enviar código'}
        loading={loading}
        onPress={form.requested ? onConfirm : onRequest}
      />

      {form.requested && (
        <Pressable onPress={() => setForm({ ...form, requested: false, code: '', password: '', confirmPassword: '' })} style={styles.textButton}>
          <Text style={styles.link}>Usar otro correo</Text>
        </Pressable>
      )}

      <Pressable onPress={() => goTo('login')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Volver al inicio de sesión</Text>
      </Pressable>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  flex:          { flex: 1, backgroundColor: '#0A0A0A' },
  splash:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', backgroundColor: '#0A0A0A', paddingHorizontal: 20, paddingVertical: 40 },

  // Card
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: '#111111',
    padding: 28,
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },

  // Logo
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  logoBox:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2E' },
  logoImage:  { width: 28, height: 28, borderRadius: 8 },
  brandBlack:{ color: '#FFFFFF', fontWeight: '900', fontSize: 18, letterSpacing: 1.5 },
  brandRed:  { color: '#E5192A', fontWeight: '900', fontSize: 18, letterSpacing: 1.5 },

  // Title
  titleRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  title:       { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  titleAccent: { color: '#E5192A', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:    { color: '#888', fontSize: 14, lineHeight: 21, marginTop: -6 },

  // Fields
  fieldGroup:   { gap: 8 },
  label:        { color: '#AAAAAA', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 52,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  eyeBtn:  { paddingHorizontal: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  eyeIcon: { fontSize: 18 },

  fieldError: { color: '#EF4444', fontSize: 12, marginTop: -2 },
  apiError:   { color: '#FCA5A5', backgroundColor: '#2A0A0A', borderRadius: 12, padding: 12, lineHeight: 20, fontSize: 13, borderWidth: 1, borderColor: '#7F1D1D' },

  // Buttons
  button:       { height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5192A', borderRadius: 14, marginTop: 4 },
  buttonPressed:{ opacity: 0.7 },
  buttonText:   { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Google
  googleButton:     { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1A1A1A', borderWidth: 1.5, borderColor: '#2C2C2E', borderRadius: 14 },
  googleIcon:       { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  googleButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Divider
  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: -4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#555', fontSize: 13 },

  // Forgot / links
  forgotWrapper: { alignSelf: 'flex-end', marginTop: -4 },
  forgotLink:    { color: '#E5192A', fontSize: 13, fontWeight: '600' },
  link:          { color: '#E5192A', fontWeight: '700', fontSize: 14 },
  textButton:    { alignSelf: 'center', paddingVertical: 4 },

  // Footer
  footerRow:  { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', marginTop: -4 },
  footerText: { color: '#666', fontSize: 14 },

  // Terms
  termsText: { color: '#666', fontSize: 12, lineHeight: 18, textAlign: 'center' },

  // Notice
  notice:     { backgroundColor: '#0A1A2A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1E3A5F' },
  noticeText: { color: '#60A5FA', lineHeight: 21, fontSize: 13 },

  // Back button
  backBtn:     { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },

  // Home screen
  home:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', padding: 32, gap: 12 },
  homeLogoBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2C2C2E', marginBottom: 8 },
  homeLogoImage:{ width: 58, height: 58, borderRadius: 16 },
  homeWelcome: { color: '#888', fontSize: 18, fontWeight: '500' },
  homeName:    { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  homeCopy:    { color: '#555', fontSize: 15 },
  signOutBtn:  { marginTop: 20, height: 50, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5192A', borderRadius: 14 },
  signOutText: { color: '#E5192A', fontWeight: '700', fontSize: 15 },
});
