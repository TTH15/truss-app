import '@/lib/supabase';

import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { ProfileRegistrationScreen } from '@/screens/ProfileRegistrationScreen';
import { SignUpScreen } from '@/screens/SignUpScreen';

SplashScreen.preventAutoHideAsync();

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

  if (!user || user.registrationStep !== 'fully_active') {
    return <ProfileRegistrationScreen />;
  }

  return <AppTabs />;
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
