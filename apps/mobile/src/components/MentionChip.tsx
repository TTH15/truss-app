import { Ionicons } from '@expo/vector-icons';
import type { MessageMention } from '@truss/core';
import { Image as ExpoImage } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MENTION_ICONS: Record<MessageMention['type'], keyof typeof Ionicons.glyphMap> = {
  event: 'calendar',
  memory: 'images',
  location: 'location',
};

interface MentionChipProps {
  mention: MessageMention;
  /** 指定すると右側に閉じるボタンが出る（送信前プレビュー用） */
  onRemove?: () => void;
}

/** イベント/思い出/位置情報への参照を、ChatGPTの引用チップのように青系の見た目で表示する */
export function MentionChip({ mention, onRemove }: MentionChipProps) {
  const colors = useTheme();
  const isLocation = mention.type === 'location' && !!mention.url;
  // Pressableで別途ラップすると内部のflex:1(textGroup)が幅を計算できず潰れることがあるため、
  // ラップではなくルート要素自体をPressable/Viewで出し分ける
  const Container = isLocation && !onRemove ? Pressable : View;
  const containerProps = isLocation && !onRemove ? { onPress: () => void Linking.openURL(mention.url!) } : {};

  return (
    <Container
      style={[styles.container, { backgroundColor: colors.backgroundSelected, borderColor: colors.tint }]}
      {...containerProps}
    >
      {mention.imageUrl ? (
        <ExpoImage source={{ uri: mention.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={styles.iconWrap}>
          <Ionicons name={MENTION_ICONS[mention.type]} size={18} color={colors.tint} />
        </View>
      )}
      <View style={styles.textGroup}>
        <ThemedText type="small" numberOfLines={1} style={{ color: colors.tint }}>
          {mention.title}
        </ThemedText>
        {mention.dateLabel && (
          <View style={styles.metaLine}>
            <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
            <ThemedText type="small" numberOfLines={1} themeColor="textSecondary" style={styles.metaLineText}>
              {mention.dateLabel}
            </ThemedText>
          </View>
        )}
        {mention.timeLabel && (
          <View style={styles.metaLine}>
            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
            <ThemedText type="small" numberOfLines={1} themeColor="textSecondary" style={styles.metaLineText}>
              {mention.timeLabel}
            </ThemedText>
          </View>
        )}
        {!mention.dateLabel && !mention.timeLabel && mention.subtitle && (
          <ThemedText type="small" numberOfLines={1} themeColor="textSecondary">
            {mention.subtitle}
          </ThemedText>
        )}
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    maxWidth: 260,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: Spacing.one,
  },
  textGroup: {
    flex: 1,
    gap: 1,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaLineText: {
    flexShrink: 1,
  },
});
