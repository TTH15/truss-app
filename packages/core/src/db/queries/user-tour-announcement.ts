import { supabase } from '../../supabase';
import { validateUserTourAnnouncement, type UserTourAnnouncement } from '../../user-tour-announcement';

/** 行が無い場合だけ null。取得失敗は運営画面でエラーとして扱い、既存設定の上書きを防ぐ。 */
export async function queryUserTourAnnouncement(signal?: AbortSignal): Promise<UserTourAnnouncement | null> {
  let query = supabase
    .from('user_tour_announcement')
    .select('title_ja,title_en,description_ja,description_en,link_label_ja,link_label_en,link_url')
    .eq('id', 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const announcement: UserTourAnnouncement = {
    title: { ja: data.title_ja, en: data.title_en },
    description: { ja: data.description_ja, en: data.description_en },
    linkLabel: { ja: data.link_label_ja, en: data.link_label_en },
    linkUrl: data.link_url,
  };
  const validationError = validateUserTourAnnouncement(announcement);
  if (validationError) throw new Error(validationError);
  return announcement;
}
