/**
 * ギャラリー関連の書き込み集約
 */
import { supabase, uploadGalleryPhoto as uploadGalleryPhotoToStorage } from "../../supabase";
import type { GalleryPhoto } from "../../types/app";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

/** Storage バケット `gallery-photos` の allowed_mime_types と一致させる */
export const GALLERY_PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif" as const;

const GALLERY_ALLOWED_MIME = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

/** contentTypeが空の場合はfileNameの拡張子から判定する（モバイルのBlobはtypeが空になりうるため） */
export function isGalleryPhotoMimeAllowed(contentType: string, fileName?: string): boolean {
  if (contentType) {
    return GALLERY_ALLOWED_MIME.has(contentType);
  }
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  return ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext);
}

function inferGalleryContentType(contentType: string, fileName: string): string {
  if (contentType) return contentType;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
  };
  return (ext && byExt[ext]) || "image/jpeg";
}

/** クライアントでトースト文言を切り替えるときに参照 */
export const GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE =
  "Gallery bucket allows only JPEG, PNG, WebP, GIF, HEIC, HEIF (other types are rejected by storage).";

/** アップロード時は imageFile で Storage に保存し、DB には公開 URL のみ保存する（image は省略可） */
export type UploadGalleryPhotoInput = Omit<
  GalleryPhoto,
  "id" | "likes" | "uploadedAt" | "approved" | "image"
> & {
  image?: GalleryPhoto["image"];
  imageFile?: { blob: Blob; fileName: string; contentType: string };
};

export async function uploadGalleryPhotoRow(
  photoData: UploadGalleryPhotoInput
): Promise<{ error: Error | null }> {
  let imageValue: string;
  if (photoData.imageFile) {
    const { blob, fileName, contentType } = photoData.imageFile;
    if (!isGalleryPhotoMimeAllowed(contentType, fileName)) {
      return { error: new Error(GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE) };
    }
    const fileExt = fileName.split(".").pop() || "jpg";
    const { url, error: upErr } = await uploadGalleryPhotoToStorage(
      photoData.userId,
      photoData.eventId,
      blob,
      { fileExt, contentType: inferGalleryContentType(contentType, fileName) }
    );
    if (upErr || !url) {
      return { error: new Error(upErr?.message ?? "ストレージへのアップロードに失敗しました") };
    }
    imageValue = url;
  } else {
    const raw = photoData.image;
    if (!raw) {
      return { error: new Error("画像が指定されていません") };
    }
    imageValue = typeof raw === "string" ? raw : raw.src;
  }

  const { error } = await supabase.from("gallery_photos").insert({
    event_id: photoData.eventId,
    event_name: photoData.eventName,
    event_date: photoData.eventDate,
    image: imageValue,
    user_id: photoData.userId,
    user_name: photoData.userName,
    height: photoData.height || null,
    likes: 0,
    approved: false,
  });

  return { error: toErrorOrNull(error) };
}

export async function deleteGalleryPhotoRow(
  photoId: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", photoId);
  return { error: toErrorOrNull(error) };
}

export async function approveGalleryPhotoRow(
  photoId: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("gallery_photos")
    .update({ approved: true })
    .eq("id", photoId);
  return { error: toErrorOrNull(error) };
}

export async function likeGalleryPhotoRow(
  photoId: number
): Promise<{ error: Error | null }> {
  const { data: currentPhoto, error: fetchError } = await supabase
    .from("gallery_photos")
    .select("likes")
    .eq("id", photoId)
    .single();
  if (fetchError) return { error: new Error(fetchError.message) };

  const { error } = await supabase
    .from("gallery_photos")
    .update({ likes: (currentPhoto?.likes || 0) + 1 })
    .eq("id", photoId);

  return { error: toErrorOrNull(error) };
}

