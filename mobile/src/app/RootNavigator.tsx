import { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Button, Copy, Loading, Page } from '../components/ui';
import { useAuth } from '../features/auth/store';
import AuthScreen from '../features/auth/AuthScreen';
import { useTheme } from '../theme/ThemeProvider';
import type { AppRoutes, AuthRoutes } from './routes';
import { HomeScreen, HelpScreen, NotificationsScreen, PaymentsScreen, ProfileScreen, ProgressScreen, ReceiptsScreen, SettingsScreen } from '../features/common/CommonScreens';
import { MechanicAgendaScreen, MechanicDashboardScreen, MechanicDetailScreen, MechanicOrdersScreen, MechanicWorksScreen } from '../features/mechanic/MechanicScreens';
import { ResourceFormScreen, ResourceListScreen } from '../features/admin/ResourceScreens';
const Stack = createNativeStackNavigator<AppRoutes>(); const Auth = createNativeStackNavigator<AuthRoutes>();
export default function RootNavigator() {
  const { user, hydrating, hydrate, connectionError } = useAuth(); const { dark, colors } = useTheme();
  useEffect(() => { void hydrate(); }, [hydrate]);
  if (hydrating) return <Page title="JENNA / CAR"><Loading /></Page>;
  if (connectionError) return <Page title="Verificar sesión"><Copy>{connectionError}</Copy><Button title="Reintentar" onPress={() => void hydrate()} /><Button secondary title="Volver al login" onPress={() => void useAuth.getState().signOut()} /></Page>;
  return <><StatusBar style={dark ? 'light' : 'dark'} /><NavigationContainer theme={{ ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, primary: colors.accent, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border } }}>{!user ? <Auth.Navigator>{(['Login', 'Registro', 'Recuperar'] as const).map(name => <Auth.Screen key={name} name={name} component={AuthScreen} />)}</Auth.Navigator> : <Stack.Navigator key={`${user.id}:${user.rol}`} screenOptions={{ headerBackTitle: 'Volver' }}>{user.rol === 'mecanico' ? <><Stack.Screen name="Mecanico" component={MechanicDashboardScreen} options={{ title: 'Mi taller',  }} /><Stack.Screen name="Agenda" component={MechanicAgendaScreen} /><Stack.Screen name="CitaMecanico" component={MechanicDetailScreen} /><Stack.Screen name="Trabajos" component={MechanicWorksScreen} /><Stack.Screen name="Historial" component={MechanicWorksScreen} /><Stack.Screen name="OrdenesMecanico" component={MechanicOrdersScreen} /></> : <><Stack.Screen name="Inicio" component={HomeScreen} /><Stack.Screen name="Recurso" component={ResourceListScreen} /><Stack.Screen name="Formulario" component={ResourceFormScreen} />{user.rol === 'usuario' && <><Stack.Screen name="Progreso" component={ProgressScreen} /><Stack.Screen name="Recibos" component={ReceiptsScreen} /><Stack.Screen name="Pagos" component={PaymentsScreen} /></>}</>}<Stack.Screen name="Perfil" component={ProfileScreen} /><Stack.Screen name="Notificaciones" component={NotificationsScreen} /><Stack.Screen name="Ajustes" component={SettingsScreen} /><Stack.Screen name="Ayuda" component={HelpScreen} /></Stack.Navigator>}</NavigationContainer></>;
}
