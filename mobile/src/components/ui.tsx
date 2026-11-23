import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export function Copy({ children, muted = false, large = false }: PropsWithChildren<{ muted?: boolean; large?: boolean }>) {
  const { colors } = useTheme();
  return <Text selectable style={{ color: muted ? colors.muted : colors.text, fontSize: large ? 26 : 16, fontWeight: large ? '800' : '400', lineHeight: large ? 34 : 24 }}>{children}</Text>;
}
export function Page({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const padding = width < 360 ? 14 : width < 600 ? 20 : 32;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={false}
        contentContainerStyle={[s.page, { paddingHorizontal: padding, paddingLeft: padding + insets.left, paddingRight: padding + insets.right, paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        <View style={{ gap: 8, paddingVertical: 8 }}>
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
          <Copy large>{title}</Copy>
          {subtitle && <Copy muted>{subtitle}</Copy>}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: width < 360 ? 14 : 20, gap: 14, minWidth: 0 }}>{children}</View>;
}
export function Button({ title, onPress, busy = false, secondary = false, disabled = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: secondary ? colors.border : colors.accent, justifyContent: 'center', alignItems: 'center', backgroundColor: secondary ? colors.tint : colors.accent, opacity: pressed || disabled ? 0.6 : 1 })}>{busy ? <ActivityIndicator color={secondary ? colors.accent : colors.bg} /> : <Text style={{ color: secondary ? colors.accent : colors.bg, fontSize: 16, lineHeight: 23, textAlign: 'center', flexShrink: 1, fontWeight: '700' }}>{title}</Text>}</Pressable>;
}
export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { colors } = useTheme(); const [focused, setFocused] = useState(false);
  return <View style={{ gap: 7 }}><Copy>{label}</Copy><TextInput {...props} accessibilityLabel={label} onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} placeholderTextColor={colors.muted} style={[{ color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: focused || error ? colors.accent : colors.border, padding: 13, minHeight: props.multiline ? 112 : 54, borderRadius: 14, fontSize: 16, textAlignVertical: props.multiline ? 'top' : 'center' }, props.style]} />{error && <ErrorText message={error} />}</View>;
}
export function ErrorText({ message }: { message: string }) { const { colors } = useTheme(); return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.accent, lineHeight: 22 }}>{message}</Text>; }
export function Loading() { const { colors } = useTheme(); return <View style={{ padding: 32 }}><ActivityIndicator accessibilityLabel="Cargando" color={colors.accent} size="large" /></View>; }
export function Choices({ values, value, onChange }: { values: readonly string[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: value === item }} onPress={() => onChange(item)} style={{ maxWidth: '100%', minHeight: 48, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: value === item ? colors.accent : colors.border, backgroundColor: value === item ? colors.tint : colors.surface }}><Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, flexShrink: 1 }}>{label(item)}</Text></Pressable>)}</View>;
}
export const label = (value: string) => value.replace(/_/g, ' ');
export const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const s = StyleSheet.create({ page: { paddingTop: 16, gap: 20, width: '100%', maxWidth: 720, alignSelf: 'center' } });
