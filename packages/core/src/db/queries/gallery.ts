/**
 * gallery_photos テーブルの読み取り
 */
import { supabase } from "../../supabase";
import { mapDbGalleryPhotoRow } from "../mappers";
import type { GalleryPhoto } from "../../types/app";

export async function queryGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDbGalleryPhotoRow);
}

/** ログイン中ユーザーが「いいね」済みの写真ID一覧（RLS により自分の行しか返らない） */
export async function queryLikedGalleryPhotoIds(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("gallery_photo_likes")
    .select("photo_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.photo_id as number);
}
