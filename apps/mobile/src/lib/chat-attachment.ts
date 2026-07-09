import { File } from 'expo-file-system';
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

async function processPickedImage(uri: string, width: number): Promise<PickedChatAttachment> {
  const actions = width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
  const manipulated = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  // RN(Hermes)の fetch().blob() は ArrayBuffer からのBlob生成に対応しておらずエラーになるため、
  // expo-file-system の File（Blobを直接実装している）をそのままアップロード用データとして使う。
  const blob = new File(manipulated.uri);
  return { uri: manipulated.uri, blob, fileExt: 'jpg', contentType: 'image/jpeg' };
}

/** チャット添付用に写真ライブラリから単一の画像を選択し、リサイズ・JPEG圧縮した上でBlobを返す */
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
  return processPickedImage(asset.uri, asset.width);
}

/** チャット添付用にカメラで撮影し、リサイズ・JPEG圧縮した上でBlobを返す */
export async function captureChatAttachment(): Promise<PickedChatAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('カメラへのアクセスが許可されていません');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return processPickedImage(asset.uri, asset.width);
}
