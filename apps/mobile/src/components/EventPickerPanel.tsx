import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@truss/core';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EventPickerPanelProps {
  events: Event[];
  onSelect: (event: Event) => void;
}

/** 添付パネル内にインライン表示するイベント選択リスト（モーダルではなく同一フィールド内で差し替える） */
export function EventPickerPanel({ events, onSelect }: EventPickerPanelProps) {
  const colors = useTheme();

  return (
    <ScrollView style={styles.list}>
      {events.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          参加登録済みのイベントがありません
        </ThemedText>
      ) : (
        events.map((event) => (
          <Pressable key={event.id} style={[styles.row, { borderColor: colors.border }]} onPress={() => onSelect(event)}>
            <View style={styles.rowText}>
              <ThemedText numberOfLines={1}>{event.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{event.date} {event.time}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
