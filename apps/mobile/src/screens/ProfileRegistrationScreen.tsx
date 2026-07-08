import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Web版の InitialRegistration/ProfileRegistration 相当のフォームは未実装（Phase 4で移植予定）。
 * ここではログイン〜プロフィール登録への導線が疎通することのみ確認する。
 */
export function ProfileRegistrationScreen() {
  const { user, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">プロフィール登録</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.description}>
          {user?.email} さん、ようこそ。プロフィール登録フォームは実装予定です。
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
