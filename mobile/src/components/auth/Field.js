import { useRef, useState } from 'react';
import { Animated, Pressable, Text, TextInput, View } from 'react-native';
import { styles } from '../../styles/authStyles';

export default function Field({ label, value, onChangeText, error, secureTextEntry, autoComplete = 'off', showToggle = false, numeric = false }) {
  const [hidden, setHidden] = useState(true);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const onFocus = () => Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  const onBlur = () => Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [error ? '#EF4444' : '#2C2C2E', error ? '#EF4444' : '#E5192A'] });

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
