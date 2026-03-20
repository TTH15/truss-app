/**
 * ギャラリー関連の書き込み集約
 */
import { supabase } from "../../supabase";
import type { GalleryPhoto } from "../../../domain/types/app";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export async function uploadGalleryPhotoRow(
  photoData: Omit<GalleryPhoto, "id" | "likes" | "uploadedAt" | "approved">
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("gallery_photos").insert({
    event_id: photoData.eventId,
    event_name: photoData.eventName,
    event_date: photoData.eventDate,
    image: photoData.image,
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

