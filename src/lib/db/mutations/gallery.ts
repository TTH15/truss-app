/**
 * ギャラリー関連の書き込み集約
 */
import { supabase, uploadGalleryPhoto as uploadGalleryPhotoToStorage } from "../../supabase";
import type { GalleryPhoto } from "../../../domain/types/app";

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

export function isGalleryPhotoMimeAllowed(file: File): boolean {
  if (file.type) {
    return GALLERY_ALLOWED_MIME.has(file.type);
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  return ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext);
}

/** クライアントでトースト文言を切り替えるときに参照 */
export const GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE =
  "Gallery bucket allows only JPEG, PNG, WebP, GIF, HEIC, HEIF (other types are rejected by storage).";

/** アップロード時は imageFile で Storage に保存し、DB には公開 URL のみ保存する（image は省略可） */
export type UploadGalleryPhotoInput = Omit<
  GalleryPhoto,
  "id" | "likes" | "uploadedAt" | "approved" | "image"
> & { image?: GalleryPhoto["image"]; imageFile?: File };

export async function uploadGalleryPhotoRow(
  photoData: UploadGalleryPhotoInput
): Promise<{ error: Error | null }> {
  let imageValue: string;
  if (photoData.imageFile) {
    if (!isGalleryPhotoMimeAllowed(photoData.imageFile)) {
      return { error: new Error(GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE) };
    }
    const { url, error: upErr } = await uploadGalleryPhotoToStorage(
      photoData.userId,
      photoData.eventId,
      photoData.imageFile
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

