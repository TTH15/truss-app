import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@truss/core';
import { normalizeEventIconKey } from '@truss/core';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getIoniconForEventIcon } from '@/lib/event-icon-map';

const STAMPS_PER_PAGE = 10;

/** users.id（UUID）から見た目上の「パスポート番号」を決定的に導出する（永続化はしていない表示専用の値） */
function derivePassportNumber(userId: string): string {
  const compact = userId.replace(/-/g, '').toUpperCase();
  return `TR-${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
}

export function PassportScreen() {
  const { user } = useAuth();
  const { events, eventParticipants, loading } = useData();
  const colors = Colors.light;

  if (!user) return null;

  const myParticipations: Event[] = events.filter((event) =>
    (eventParticipants[event.id] || []).some((p) => p.userId === user.id)
  );
  const journeyCount = myParticipations.length;
  const stampSlots = Array.from({ length: STAMPS_PER_PAGE }, (_, i) => myParticipations[i] ?? null);
  const memberSince = user.membershipYear ? `${user.membershipYear}` : '—';
  const categoryLabel =
    user.category === 'japanese' ? '日本人学生・国内学生' : user.category === 'regular-international' ? '正規留学生' : '交換留学生';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.passportCard, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>{user.name.charAt(0) || '?'}</ThemedText>
            </View>
            <ThemedText type="title" style={styles.name}>{user.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{user.furigana}</ThemedText>
            <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="small" style={{ color: colors.tint }}>{categoryLabel}</ThemedText>
            </View>

            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <Stat label="Passport No." value={derivePassportNumber(user.id)} colors={colors} />
              <Stat label="Member Since" value={memberSince} colors={colors} />
              <Stat label="Journey" value={String(journeyCount)} colors={colors} />
              <Stat label="Connections" value="0" colors={colors} />
            </View>
          </View>

          <View style={styles.stampSection}>
            <ThemedText type="subtitle" style={styles.stampSectionTitle}>Journey Stamps</ThemedText>
            {loading ? (
              <ThemedText type="small" themeColor="textSecondary">読み込み中...</ThemedText>
            ) : (
              <View style={styles.stampGrid}>
                {stampSlots.map((event, index) => (
                  <StampSlot key={event?.id ?? `empty-${index}`} event={event} colors={colors} />
                ))}
              </View>
            )}
            {journeyCount > STAMPS_PER_PAGE && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.moreStampsNote}>
                他 {journeyCount - STAMPS_PER_PAGE} 件のJourney（次ページ表示は今後実装予定）
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: typeof Colors.light }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

function StampSlot({ event, colors }: { event: Event | null; colors: typeof Colors.light }) {
  if (!event) {
    return <View style={[styles.stampSlot, styles.stampSlotEmpty, { borderColor: colors.border }]} />;
  }
  const iconName = getIoniconForEventIcon(normalizeEventIconKey(event.eventIconKey));
  return (
    <View style={[styles.stampSlot, { backgroundColor: colors.backgroundSelected, borderColor: colors.tint }]}>
      <Ionicons name={iconName} size={22} color={colors.tint} />
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
    gap: Spacing.five,
  },
  passportCard: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  name: {
    marginTop: Spacing.one,
  },
  badge: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  stampSection: {
    gap: Spacing.two,
  },
  stampSectionTitle: {
    marginBottom: Spacing.one,
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stampSlot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stampSlotEmpty: {
    borderStyle: 'dashed',
  },
  moreStampsNote: {
    marginTop: Spacing.one,
  },
});
