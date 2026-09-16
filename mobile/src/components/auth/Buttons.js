import { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, Text } from 'react-native';
import { styles } from '../../styles/authStyles';

function AnimatedButton({ children, disabled, onPress, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={({ pressed }) => [style, (pressed || disabled) && styles.buttonPressed]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function SubmitButton({ title, loading, onPress }) {
  return <AnimatedButton disabled={loading} onPress={onPress} style={styles.button}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{title}</Text>}</AnimatedButton>;
}

export function GoogleButton({ onPress, disabled }) {
  return <AnimatedButton disabled={disabled} onPress={onPress} style={styles.googleButton}><Text style={styles.googleIcon}>G</Text><Text style={styles.googleButtonText}>Continuar con Google</Text></AnimatedButton>;
}
