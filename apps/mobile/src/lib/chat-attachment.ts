import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedChatAttachment {
  /** ローカルプレビュー表示用 */
  uri: string;
  /** Supabase Storageへのアップロード用 */
  blob: Blob;
  fileExt: string;
  contentType: string;
}

const MAX_WIDTH = 1600;

/** チャット添付用に単一の画像を選択し、リサイズ・JPEG圧縮した上でBlobを返す */
export async function pickChatAttachment(): Promise<PickedChatAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('写真ライブラリへのアクセスが許可されていません');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const actions = asset.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
  const manipulated = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  return { uri: manipulated.uri, blob, fileExt: 'jpg', contentType: 'image/jpeg' };
}
