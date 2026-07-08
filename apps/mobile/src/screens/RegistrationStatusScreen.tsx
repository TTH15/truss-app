import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_MESSAGES: Record<string, string> = {
  waiting_approval: '運営の承認をお待ちください。承認され次第、ご利用いただけます。',
  approved_limited: '承認されました。一部機能が制限された状態です。',
  profile_completion: 'プロフィールの入力を完了してください（実装予定）。',
  fee_payment: '会費のお支払いをお願いします（実装予定）。',
};

/**
 * 初期登録は完了しているが `fully_active` に達していない状態（承認待ち等）のスタブ画面。
 * Web版に専用の待機画面はなくDashboard内のバナーで表現しているが、
 * モバイルはまだDashboard相当の画面がないため単独画面として用意する。
 */
export function RegistrationStatusScreen() {
  const { user, signOut } = useAuth();
  const message = (user?.registrationStep && STATUS_MESSAGES[user.registrationStep]) || '手続き中です。';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Truss</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.description}>
          {message}
        </ThemedText>
        <Pressable onPress={() => void signOut()}>
          <ThemedText type="link" themeColor="tint">
            ログアウト
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
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  description: {
    textAlign: 'center',
  },
});
