/**
 * Web Push の購読情報の保存・削除（migration 034）
 *
 * 送信側（サーバー）はこのテーブルを service role で読み、VAPID 鍵で署名して各 endpoint に配信する。
 * クライアントからは自分の行しか触れない（RLS）。
 */
import { supabase } from "../../supabase";

function toErrorOrNull(error: { message: string } | null) {
  return error ? new Error(error.message) : null;
}

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

/** endpoint は端末ごとに一意。再購読で同じ endpoint が来たら上書きする */
export async function savePushSubscriptionRow(
  userId: string,
  input: PushSubscriptionInput
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: input.endpoint,
      user_id: userId,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );
  return { error: toErrorOrNull(error) };
}

export async function deletePushSubscriptionRow(
  endpoint: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { error: toErrorOrNull(error) };
}

/** この端末で通知を受け取る設定になっているか（設定画面の表示用） */
export async function queryPushSubscriptionExists(endpoint: string): Promise<boolean> {
  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();
  return Boolean(data);
}
