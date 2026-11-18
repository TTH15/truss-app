import { supabase } from '../../supabase';

export type AdminChatAttentionPreferences = { showReplyMarks: boolean; highlightAfterDays: number; reminderEnabled: boolean; remindAfterDays: number };
export const DEFAULT_CHAT_ATTENTION: AdminChatAttentionPreferences = { showReplyMarks: true, highlightAfterDays: 0, reminderEnabled: false, remindAfterDays: 1 };

export async function queryAdminChatAttention(adminUserId: string) {
  const { data, error } = await supabase.from('admin_chat_attention_preferences')
    .select('show_reply_marks,highlight_after_days,reminder_enabled,remind_after_days').eq('admin_user_id', adminUserId).maybeSingle();
  if (error) throw error;
  const dismissals: Record<string, number> = {};
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from('admin_chat_attention_dismissals').select('thread_user_id,message_id')
      .eq('admin_user_id', adminUserId).order('thread_user_id').range(offset, offset + 999);
    if (result.error) throw result.error;
    for (const row of result.data ?? []) dismissals[row.thread_user_id] = row.message_id;
    if ((result.data?.length ?? 0) < 1000) break;
  }
  return { preferences: data ? { showReplyMarks: data.show_reply_marks, highlightAfterDays: data.highlight_after_days, reminderEnabled: data.reminder_enabled, remindAfterDays: data.remind_after_days } : DEFAULT_CHAT_ATTENTION, dismissals };
}

export async function saveAdminChatAttention(adminUserId: string, preferences: AdminChatAttentionPreferences) {
  if (!Number.isInteger(preferences.highlightAfterDays) || preferences.highlightAfterDays < 0 || preferences.highlightAfterDays > 30) throw new Error('Invalid highlight days');
  if (!Number.isInteger(preferences.remindAfterDays) || preferences.remindAfterDays < 1 || preferences.remindAfterDays > 30) throw new Error('Invalid reminder days');
  const { error } = await supabase.from('admin_chat_attention_preferences').upsert({ admin_user_id: adminUserId, show_reply_marks: preferences.showReplyMarks, highlight_after_days: preferences.highlightAfterDays, reminder_enabled: preferences.reminderEnabled, remind_after_days: preferences.remindAfterDays }, { onConflict: 'admin_user_id' }).select('admin_user_id').single();
  if (error) throw error;
}

export async function dismissAdminChatAttention(adminUserId: string, threadUserId: string, messageId: number) {
  const { error } = await supabase.from('admin_chat_attention_dismissals').upsert({ admin_user_id: adminUserId, thread_user_id: threadUserId, message_id: messageId }, { onConflict: 'admin_user_id,thread_user_id' }).select('message_id').single();
  if (error) throw error;
}

export async function restoreAdminChatAttention(adminUserId: string, threadUserId?: string) {
  let query = supabase.from('admin_chat_attention_dismissals').delete().eq('admin_user_id', adminUserId);
  if (threadUserId) query = query.eq('thread_user_id', threadUserId);
  const { error } = await query;
  if (error) throw error;
}
