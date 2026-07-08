import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface SignUpScreenProps {
  onNavigateToLogin: () => void;
}

export function SignUpScreen({ onNavigateToLogin }: SignUpScreenProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);
  const colors = Colors.light;

  const isUniversityEmail = /\.ac\.jp$/i.test(email.trim());

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await signUp(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSignedUp(true);
  };

  if (signedUp) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">確認メールを送信しました</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            メール内のリンクから登録を完了してください。
          </ThemedText>
          <Pressable onPress={onNavigateToLogin}>
            <ThemedText type="link" themeColor="tint">
              ログイン画面に戻る
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          新規登録
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
        {isUniversityEmail && (
          <ThemedText type="small" themeColor="textSecondary">
            大学発行のメールアドレスは卒業後利用できなくなります。個人のメールアドレスの利用を推奨します。
          </ThemedText>
        )}
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          autoComplete="password-new"
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
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>登録する</ThemedText>}
        </Pressable>

        <Pressable onPress={onNavigateToLogin}>
          <ThemedText type="link" themeColor="tint">
            すでにアカウントをお持ちの方はこちら
          </ThemedText>
        </Pressable>
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  error: {
    color: '#D14343',
  },
});
