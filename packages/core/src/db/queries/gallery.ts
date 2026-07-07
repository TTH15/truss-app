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
