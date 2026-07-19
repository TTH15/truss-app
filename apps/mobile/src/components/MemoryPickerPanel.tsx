import type { GalleryPhoto } from '@truss/core';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface MemoryPickerPanelProps {
  photos: GalleryPhoto[];
  onSelect: (photo: GalleryPhoto) => void;
}

/** 添付パネル内にインライン表示する思い出写真の選択グリッド（モーダルではなく同一フィールド内で差し替える） */
export function MemoryPickerPanel({ photos, onSelect }: MemoryPickerPanelProps) {
  return (
    <ScrollView style={styles.scroll}>
      {photos.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
          投稿済みの思い出写真がありません
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => {
            const uri = typeof photo.image === 'string' ? photo.image : photo.image.src;
            return (
              <Pressable key={photo.id} style={styles.thumbWrap} onPress={() => onSelect(photo)}>
                <ExpoImage source={{ uri }} style={styles.thumb} cachePolicy="memory-disk" />
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  thumbWrap: {
    width: '31%',
    aspectRatio: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.two,
  },
});
