import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedGalleryImage {
  /** ローカルプレビュー表示用 */
  uri: string;
  /** Supabase Storageへのアップロード用 */
  blob: Blob;
  fileName: string;
  contentType: string;
}

const MAX_WIDTH = 1920;
const MAX_SELECTION = 10;

/**
 * ギャラリー写真をライブラリから複数選択し、リサイズ・JPEG圧縮した上でBlobを返す。
 */
export async function pickGalleryImages(): Promise<PickedGalleryImage[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('写真ライブラリへのアクセスが許可されていません');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: true,
    selectionLimit: MAX_SELECTION,
  });
  if (result.canceled || !result.assets?.length) return [];

  const picked: PickedGalleryImage[] = [];
  for (const [index, asset] of result.assets.entries()) {
    const actions = asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
    const manipulated = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const response = await fetch(manipulated.uri);
    const blob = await response.blob();
    picked.push({
      uri: manipulated.uri,
      blob,
      fileName: `photo-${Date.now()}-${index}.jpg`,
      contentType: 'image/jpeg',
    });
  }
  return picked;
}
