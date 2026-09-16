import * as NavigationBar from 'expo-navigation-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

import useAuth from './src/hooks/useAuth';
import RootNavigator from './src/navigation/RootNavigator';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const auth = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const setNavigationBar = () => {
      NavigationBar.setButtonStyleAsync('light');
    };
    setNavigationBar();
    const showSubscription = Keyboard.addListener('keyboardDidShow', setNavigationBar);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', setNavigationBar);
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return <RootNavigator auth={auth} />;
}