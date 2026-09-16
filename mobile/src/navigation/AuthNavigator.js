import { LoginScreen, RecoveryScreen, RegisterScreen } from '../screens/auth';

export default function AuthNavigator({ screen, loginForm, setLoginForm, registerForm, setRegisterForm, recoveryForm, setRecoveryForm, errors, apiError, message, loading, onLogin, onRegister, onGoogleLogin, googleReady, onRecoveryRequest, onRecoveryConfirm, goTo }) {
  if (screen === 'register') {
    return <RegisterScreen form={registerForm} setForm={setRegisterForm} errors={errors} apiError={apiError} loading={loading} onSubmit={onRegister} goTo={goTo} />;
  }
  if (screen === 'recovery') {
    return <RecoveryScreen form={recoveryForm} setForm={setRecoveryForm} errors={errors} apiError={apiError} message={message} loading={loading} onRequest={onRecoveryRequest} onConfirm={onRecoveryConfirm} goTo={goTo} />;
  }
  return <LoginScreen form={loginForm} setForm={setLoginForm} errors={errors} apiError={apiError} message={message} loading={loading} onSubmit={onLogin} onGoogleLogin={onGoogleLogin} googleReady={googleReady} goTo={goTo} />;
}