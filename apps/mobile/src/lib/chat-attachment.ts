import * as DocumentPicker from 'expo-document-picker';
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
  /** 画像以外（File選択）の場合のみ設定。元のファイル名をメッセージ本文として使う */
  fileName?: string;
  /** ボイスメッセージの場合のみ設定。長さ表示に使う */
  durationMillis?: number;
  /** ボイスメッセージの場合のみ設定。波形表示用の音量サンプル(0〜1、固定本数) */
  waveform?: number[];
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

/** 録音済みのボイスメッセージファイル（ローカルURI）をチャット添付用Blobに変換する */
export function finalizeVoiceAttachment(uri: string, durationMillis: number, waveform: number[]): PickedChatAttachment {
  const blob = new File(uri);
  return { uri, blob, fileExt: 'm4a', contentType: 'audio/m4a', durationMillis, waveform };
}

/** チャット添付用に任意のファイルを選択し、そのままBlob化して返す（リサイズ等は行わない） */
export async function pickChatFile(): Promise<PickedChatAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const fileExt = asset.name.includes('.') ? asset.name.split('.').pop()! : 'bin';
  const blob = new File(asset.uri);
  return {
    uri: asset.uri,
    blob,
    fileExt,
    contentType: asset.mimeType || 'application/octet-stream',
    fileName: asset.name,
  };
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
