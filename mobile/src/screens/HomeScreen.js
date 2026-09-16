import { Image, Pressable, Text, View } from 'react-native';
import { styles } from '../styles/authStyles';

export default function HomeScreen({ user, onSignOut }) {
  return <View style={styles.home}>
    <View style={styles.homeLogoBox}><Image source={require('../../assets/logo_car.jpg')} style={styles.homeLogoImage} /></View>
    <Text style={styles.homeWelcome}>{user ? 'Bienvenido,' : 'Bienvenido'}</Text>
    {user && <Text style={styles.homeName}>{user.nombre} 👋</Text>}
    <Text style={styles.homeCopy}>Tu sesión está activa.</Text>
    <Pressable onPress={onSignOut} style={({ pressed }) => [styles.signOutBtn, pressed && styles.buttonPressed]}><Text style={styles.signOutText}>Cerrar sesión</Text></Pressable>
  </View>;
}
