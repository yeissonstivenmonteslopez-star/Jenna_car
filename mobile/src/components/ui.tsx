import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Copy({ children, muted = false, large = false }: PropsWithChildren<{ muted?: boolean; large?: boolean }>) {
  const { colors } = useTheme();
  return <Text selectable style={{ color: muted ? colors.muted : colors.text, fontSize: large ? 26 : 16, fontWeight: large ? '800' : '400', lineHeight: large ? 34 : 24 }}>{children}</Text>;
}
export function Page({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  const { colors } = useTheme();
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}><View style={{ borderLeftWidth: 5, borderLeftColor: colors.accent, paddingLeft: 14, gap: 6 }}><Copy large>{title}</Copy>{subtitle && <Copy muted>{subtitle}</Copy>}</View>{children}</ScrollView></KeyboardAvoidingView>;
}
export function Card({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 }}>{children}</View>;
}
export function Button({ title, onPress, busy = false, secondary = false, disabled = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || disabled, busy }} disabled={busy || disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, padding: 13, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: secondary ? colors.tint : colors.accent, opacity: pressed || disabled ? 0.6 : 1 })}>{busy ? <ActivityIndicator color={secondary ? colors.accent : colors.bg} /> : <Text style={{ color: secondary ? colors.accent : colors.bg, fontSize: 15, fontWeight: '700' }}>{title}</Text>}</Pressable>;
}
export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { colors } = useTheme(); const [focused, setFocused] = useState(false);
  return <View style={{ gap: 7 }}><Copy>{label}</Copy><TextInput {...props} accessibilityLabel={label} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholderTextColor={colors.muted} style={{ color: colors.text, backgroundColor: colors.surface, borderWidth: focused ? 2 : 1, borderColor: focused || error ? colors.accent : colors.border, padding: 13, minHeight: 50, borderRadius: 12, fontSize: 16, textAlignVertical: props.multiline ? 'top' : 'center' }} />{error && <ErrorText message={error} />}</View>;
}
export function ErrorText({ message }: { message: string }) { const { colors } = useTheme(); return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.accent, lineHeight: 22 }}>{message}</Text>; }
export function Loading() { const { colors } = useTheme(); return <View style={{ padding: 32 }}><ActivityIndicator accessibilityLabel="Cargando" color={colors.accent} size="large" /></View>; }
export function Choices({ values, value, onChange }: { values: readonly string[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{values.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: value === item }} onPress={() => onChange(item)} style={{ minHeight: 44, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: value === item ? colors.accent : colors.border, backgroundColor: value === item ? colors.tint : colors.surface }}><Text style={{ color: colors.text }}>{label(item)}</Text></Pressable>)}</View>;
}
export const label = (value: string) => value.replace(/_/g, ' ');
export const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
const s = StyleSheet.create({ page: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 780, alignSelf: 'center' } });
