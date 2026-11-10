import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const light = { bg: '#F5F4F0', surface: '#FFFFFF', text: '#171B22', muted: '#556171', border: '#CED3DA', accent: '#BD1528', tint: '#FFE9EC', success: '#176943' };
const dark = { bg: '#101318', surface: '#1B2028', text: '#F4F5F7', muted: '#B3BDCB', border: '#414B58', accent: '#FF6F80', tint: '#3B2028', success: '#71D5A2' };
type Mode = 'system' | 'light' | 'dark';
const ThemeContext = createContext({ colors: light, dark: false, mode: 'system' as Mode, setMode: (_mode: Mode) => {} });
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, update] = useState<Mode>('system');
  useEffect(() => { SecureStore.getItemAsync('jenna_theme').then(value => { if (value === 'light' || value === 'dark') update(value); }).catch(() => {}); }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const setMode = (next: Mode) => { update(next); void SecureStore.setItemAsync('jenna_theme', next).catch(() => {}); };
  return <ThemeContext.Provider value={{ colors: isDark ? dark : light, dark: isDark, mode, setMode }}>{children}</ThemeContext.Provider>;
}
