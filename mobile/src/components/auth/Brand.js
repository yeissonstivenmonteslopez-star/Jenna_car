import { Image, Text, View } from 'react-native';
import { styles } from '../../styles/authStyles';

export function Logo() {
  return <View style={styles.logoRow}><View style={styles.logoBox}><Image source={require('../../../assets/logo_car.jpg')} style={styles.logoImage} /></View><View><Text style={styles.brandBlack}>JENNA </Text></View><Text style={styles.brandRed}>CAR</Text></View>;
}

export function Divider() {
  return <View style={styles.dividerRow}><View style={styles.dividerLine} /><Text style={styles.dividerText}>o</Text><View style={styles.dividerLine} /></View>;
}
