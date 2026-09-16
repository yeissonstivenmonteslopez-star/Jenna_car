import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Logo } from '../components/auth';
import HomeScreen from '../screens/HomeScreen';
import { styles } from '../styles/authStyles';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator({ auth }) {
  if (auth.hydrating) {
    return <View style={styles.splash}><ActivityIndicator size="large" color="#E5192A" /></View>;
  }

  if (auth.screen === 'home') {
    return <><StatusBar style="light" /><HomeScreen user={auth.user} onSignOut={auth.handleSignOut} /></>;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <StatusBar style="light" />
        <View style={styles.card}>
          <Logo />
          <AuthNavigator
            screen={auth.screen}
            loginForm={auth.loginForm}
            setLoginForm={auth.setLoginForm}
            registerForm={auth.registerForm}
            setRegisterForm={auth.setRegisterForm}
            recoveryForm={auth.recoveryForm}
            setRecoveryForm={auth.setRecoveryForm}
            errors={auth.errors}
            apiError={auth.apiError}
            message={auth.recoveryMessage}
            loading={auth.loading}
            onLogin={auth.handleLogin}
            onRegister={auth.handleRegister}
            onGoogleLogin={auth.handleGoogleLogin}
            googleReady={auth.googleConfigured && Boolean(auth.googleRequest)}
            onRecoveryRequest={auth.handlePasswordResetRequest}
            onRecoveryConfirm={auth.handlePasswordResetConfirm}
            goTo={auth.goTo}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}