import '@/lib/supabase';

import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { EmbassyMentionProvider, useEmbassyMention } from '@/contexts/EmbassyMentionContext';
import { InitialRegistrationScreen } from '@/screens/InitialRegistrationScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegistrationStatusScreen } from '@/screens/RegistrationStatusScreen';
import { SignUpScreen } from '@/screens/SignUpScreen';
import { TrussEmbassyScreen } from '@/screens/TrussEmbassyScreen';

SplashScreen.preventAutoHideAsync();

const PRE_REGISTRATION_STEPS = new Set(['email_input', 'email_sent', 'email_verified', 'initial_registration']);

function RootNavigator() {
  const { session, user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<'login' | 'sign-up'>('login');
  const colors = Colors.light;

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.tint} />
      </ThemedView>
    );
  }

  if (!session) {
    return authScreen === 'login' ? (
      <LoginScreen onNavigateToSignUp={() => setAuthScreen('sign-up')} />
    ) : (
      <SignUpScreen onNavigateToLogin={() => setAuthScreen('login')} />
    );
  }

  if (!user || PRE_REGISTRATION_STEPS.has(user.registrationStep)) {
    return <InitialRegistrationScreen />;
  }

  if (user.registrationStep !== 'fully_active') {
    return <RegistrationStatusScreen />;
  }

  return (
    <DataProvider>
      <EmbassyMentionProvider>
        <AppTabs />
        <EmbassyChatHost />
      </EmbassyMentionProvider>
    </DataProvider>
  );
}

/**
 * Embassy ChatのModalは、各タブ画面の中ではなくタブより上のここでホストする。
 * expo-router Tabsは非アクティブなタブ画面も裏でマウントし続けるが、そのタブ画面の中で
 * Modalを開いても（そのタブが表示されていない間は）画面に反映されないことがあるため、
 * どのタブからでも同じ状態で確実に開けるようにルートレイアウトに置いている。
 */
function EmbassyChatHost() {
  const { isEmbassyOpen, closeEmbassy } = useEmbassyMention();
  return (
    <Modal visible={isEmbassyOpen} transparent animationType="none" onRequestClose={closeEmbassy}>
      <TrussEmbassyScreen onClose={closeEmbassy} />
    </Modal>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    Caveat_600SemiBold,
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
