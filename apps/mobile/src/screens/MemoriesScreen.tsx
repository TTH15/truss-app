import { Ionicons } from '@expo/vector-icons';
import type { GalleryPhoto } from '@truss/core';
import { GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE } from '@truss/core';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SelectField } from '@/components/SelectField';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { pickGalleryImages, type PickedGalleryImage } from '@/lib/gallery-image';

const NUM_COLUMNS = 2;

export function MemoriesScreen() {
  const { user } = useAuth();
  const { events, galleryPhotos, uploadGalleryPhoto, likeGalleryPhoto } = useData();
  const colors = Colors.light;
  const insets = useSafeAreaInsets();

  const [likedPhotoIds, setLikedPhotoIds] = useState<Set<number>>(new Set());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [pickedImages, setPickedImages] = useState<PickedGalleryImage[]>([]);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (user && !user.approved) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Memories</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.pendingText}>
            承認待ちのため、ギャラリーを閲覧できません。
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const approvedPhotos = galleryPhotos.filter((p) => p.approved);
  const eventOptions = events.map((e) => ({ label: e.title, value: String(e.id) }));

  const handleToggleLike = async (photo: GalleryPhoto) => {
    if (likedPhotoIds.has(photo.id)) return;
    setLikedPhotoIds((prev) => new Set(prev).add(photo.id));
    await likeGalleryPhoto(photo.id);
  };

  const openUpload = () => {
    setUploadOpen(true);
    setSelectedEventId('');
    setPickedImages([]);
    setErrorMessage(null);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setSelectedEventId('');
    setPickedImages([]);
    setErrorMessage(null);
  };

  const handlePickImages = async () => {
    setPicking(true);
    setErrorMessage(null);
    try {
      const picked = await pickGalleryImages();
      if (picked.length > 0) setPickedImages(picked);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPicking(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedEventId || pickedImages.length === 0 || !user) return;
    const event = events.find((e) => String(e.id) === selectedEventId);
    if (!event) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      for (const image of pickedImages) {
        await uploadGalleryPhoto({
          eventId: event.id,
          eventName: event.title,
          eventDate: event.date,
          imageFile: { blob: image.blob, fileName: image.fileName, contentType: image.contentType },
          height: 200,
          userId: user.id,
          userName: user.nickname || user.name,
        });
      }
      closeUpload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(
        message === GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE
          ? 'JPEG・PNG・WebP・GIF・HEIC/HEIF のみアップロードできます'
          : `アップロードに失敗しました: ${message}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={approvedPhotos}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<ThemedText type="subtitle" style={styles.header}>Memories</ThemedText>}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              まだ写真がありません
            </ThemedText>
          }
          renderItem={({ item }) => {
            const isLiked = likedPhotoIds.has(item.id);
            const imageUri = typeof item.image === 'string' ? item.image : item.image.src;
            return (
              <View style={styles.photoCard}>
                <Image source={{ uri: imageUri }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <ThemedText type="small" style={styles.photoEventName} numberOfLines={1}>
                    {item.eventName}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.likeButton, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => void handleToggleLike(item)}
                >
                  <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={16} color="#E0607E" />
                  <ThemedText type="small">{item.likes + (isLiked ? 1 : 0)}</ThemedText>
                </Pressable>
              </View>
            );
          }}
        />

        <Pressable style={[styles.fab, { backgroundColor: colors.tint }]} onPress={openUpload}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>

      <Modal visible={uploadOpen} animationType="slide" onRequestClose={closeUpload}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={[styles.uploadContent, { paddingTop: insets.top + Spacing.four }]}>
              <View style={styles.uploadHeaderRow}>
                <ThemedText type="subtitle">写真を追加</ThemedText>
                <Pressable onPress={closeUpload}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <SelectField
                label="イベント"
                placeholder="イベントを選択"
                value={selectedEventId}
                options={eventOptions}
                onChange={setSelectedEventId}
              />

              <Pressable
                style={[styles.pickButton, { borderColor: colors.border }]}
                onPress={() => void handlePickImages()}
                disabled={picking}
              >
                {picking ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <ThemedText style={{ color: colors.text }}>
                    {pickedImages.length > 0 ? `${pickedImages.length}枚選択中（タップで選び直す）` : '写真を選択'}
                  </ThemedText>
                )}
              </Pressable>

              {pickedImages.length > 0 && (
                <View style={styles.previewGrid}>
                  {pickedImages.map((image) => (
                    <Image key={image.uri} source={{ uri: image.uri }} style={styles.previewImage} />
                  ))}
                </View>
              )}

              {errorMessage && <ThemedText type="small" style={styles.errorText}>{errorMessage}</ThemedText>}

              <Pressable
                style={[
                  styles.uploadButton,
                  { backgroundColor: colors.tint },
                  (!selectedEventId || pickedImages.length === 0 || uploading) && styles.uploadButtonDisabled,
                ]}
                onPress={() => void handleUpload()}
                disabled={!selectedEventId || pickedImages.length === 0 || uploading}
              >
                {uploading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.uploadButtonText}>追加する</ThemedText>}
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  row: {
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  photoCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    marginBottom: Spacing.two,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  photoEventName: {
    color: '#FFFFFF',
  },
  likeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.four,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  pendingText: {
    paddingHorizontal: Spacing.four,
    textAlign: 'center',
  },
  uploadContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  previewImage: {
    width: 90,
    height: 90,
    borderRadius: Spacing.two,
  },
  uploadButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  errorText: {
    color: '#D14343',
  },
});
