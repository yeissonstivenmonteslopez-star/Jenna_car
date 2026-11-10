import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/app/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
WebBrowser.maybeCompleteAuthSession();
export default function App() { return <SafeAreaProvider><ThemeProvider><RootNavigator /></ThemeProvider></SafeAreaProvider>; }
