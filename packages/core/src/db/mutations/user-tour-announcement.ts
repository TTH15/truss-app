import { supabase } from '../../supabase';
import {
  normalizeUserTourAnnouncement,
  validateUserTourAnnouncement,
  type UserTourAnnouncement,
} from '../../user-tour-announcement';

/** 最後の案内を保存する（RLS により運営のみ）。 */
export async function upsertUserTourAnnouncementRow(input: UserTourAnnouncement): Promise<{ error: Error | null }> {
  const announcement = normalizeUserTourAnnouncement(input);
  const validationError = validateUserTourAnnouncement(announcement);
  if (validationError) return { error: new Error(validationError) };
  const { error } = await supabase.from('user_tour_announcement').upsert({
    id: 1,
    title_ja: announcement.title.ja,
    title_en: announcement.title.en,
    description_ja: announcement.description.ja,
    description_en: announcement.description.en,
    link_label_ja: announcement.linkLabel.ja,
    link_label_en: announcement.linkLabel.en,
    link_url: announcement.linkUrl,
  }, { onConflict: 'id' }).select('id').single();
  return { error: error ? new Error(error.message) : null };
}
