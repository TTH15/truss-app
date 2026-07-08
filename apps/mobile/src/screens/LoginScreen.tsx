import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface LoginScreenProps {
  onNavigateToSignUp: () => void;
}

export function LoginScreen({ onNavigateToSignUp }: LoginScreenProps) {
  const { signIn, signInWithGoogle, signInAsMockUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colors = Colors.light;

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setErrorMessage(error.message);
  };

  const handleGoogleSignIn = async () => {
    setGoogleSubmitting(true);
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    setGoogleSubmitting(false);
    if (error) setErrorMessage(error.message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="accent">The journey continues.</ThemedText>
        <ThemedText type="title" style={styles.title}>
          Truss
        </ThemedText>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage && (
          <ThemedText type="small" style={styles.error}>
            {errorMessage}
          </ThemedText>
        )}

        <Pressable
          style={[styles.button, { backgroundColor: colors.tint }, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>ログイン</ThemedText>}
        </Pressable>

        <Pressable
          style={[styles.button, styles.googleButton, { borderColor: colors.border }, googleSubmitting && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={googleSubmitting}
        >
          {googleSubmitting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <ThemedText style={{ color: colors.text }}>Googleでログイン</ThemedText>
          )}
        </Pressable>

        <Pressable onPress={onNavigateToSignUp}>
          <ThemedText type="link" themeColor="tint">
            アカウントをお持ちでない方はこちら
          </ThemedText>
        </Pressable>

        {__DEV__ && (
          <Pressable style={styles.devButton} onPress={signInAsMockUser}>
            <ThemedText type="small" themeColor="textSecondary">
              [DEV] モックユーザーでタブ画面を確認
            </ThemedText>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  title: {
    marginBottom: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  error: {
    color: '#D14343',
  },
  devButton: {
    marginTop: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B0B0B0',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
