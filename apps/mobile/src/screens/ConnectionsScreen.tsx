import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';

/**
 * design-concept.md「Connections」: 友達一覧ではなく「人生で出会った人」を記録するページ。
 * DM機能は持たず、LINE/WhatsApp/Instagram等の外部連絡先に繋ぐだけ。
 * 「出会う」きっかけを作るConnection Bump（BLE）はPhase 5でまだ実装されていないため、
 * 実データは存在しない。ここではコンセプトを正しく伝える空状態のみを実装する。
 */
export function ConnectionsScreen() {
  const colors = Colors.light;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Connections</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            人生で出会った人を記録する場所
          </ThemedText>

          <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name="people-outline" size={32} color={colors.tint} />
            </View>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              まだ誰とも繋がっていません
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDescription}>
              イベントで出会った人とスマホを近づけると、Connection Bumpでここに記録されます。
              LINEやInstagramなど、その後のやり取りは外部アプリにお任せします。
            </ThemedText>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="small" style={{ color: colors.tint }}>Connection Bump 実装予定</ThemedText>
            </View>
          </View>

          <View style={styles.linkRow}>
            <ExternalAppIcon name="chatbubble-ellipses-outline" label="LINE" colors={colors} />
            <ExternalAppIcon name="logo-whatsapp" label="WhatsApp" colors={colors} />
            <ExternalAppIcon name="logo-instagram" label="Instagram" colors={colors} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ExternalAppIcon({
  name,
  label,
  colors,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.externalAppItem}>
      <View style={[styles.externalAppIcon, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Ionicons name={name} size={20} color={colors.textSecondary} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.five,
    marginTop: Spacing.four,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonBadge: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    marginTop: Spacing.two,
  },
  externalAppItem: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  externalAppIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
