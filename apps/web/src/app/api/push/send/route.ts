import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

/**
 * Web Push の送信。
 *
 * 誰でも会員に通知を送れてはいけないので、呼び出し元の Supabase セッションを検証し、
 * `users.is_admin` が真の場合のみ送信する。購読情報の読み取りと失効行の削除は
 * service role で行う（RLS 上、他人の購読は本人以外読めないため）。
 */

/** 通知の種類。会員ごとの受信設定（users.notify_*）で絞り込む */
type NotificationCategory = "message" | "event" | "announcement";

const PREFERENCE_COLUMN: Record<NotificationCategory, string> = {
  message: "notify_message",
  event: "notify_event",
  announcement: "notify_announcement",
};

type SendBody = {
  userIds?: string[];
  title?: string;
  body?: string;
  /** 通知をタップしたときに開くパス（既定は /dashboard） */
  url?: string;
  tag?: string;
  category?: NotificationCategory;
};

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:truss.kobe@gmail.com";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase env is not configured" }, { status: 500 });
  }
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  }

  // 1) 呼び出し元が運営かどうかを、本人のアクセストークンで検証する
  const authHeader = req.headers.get("authorization") ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerRow } = await adminClient
    .from("users")
    .select("id,is_admin")
    .eq("auth_id", authData.user.id)
    .maybeSingle();

  if (!callerRow?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) 送信内容
  const { userIds, title, body, url, tag, category } = (await req.json()) as SendBody;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // 種類が指定されていれば、その通知を受け取る設定の人だけに絞る
  let targetUserIds = userIds;
  if (category && PREFERENCE_COLUMN[category]) {
    const { data: optedIn } = await adminClient
      .from("users")
      .select("id")
      .in("id", userIds)
      .eq(PREFERENCE_COLUMN[category], true);
    targetUserIds = (optedIn ?? []).map((row) => row.id as string);
    if (targetUserIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, removed: 0, skipped: userIds.length });
    }
  }

  const { data: subscriptions, error: subError } = await adminClient
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .in("user_id", targetUserIds);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, removed: 0 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/dashboard", tag });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint as string,
            keys: { p256dh: subscription.p256dh as string, auth: subscription.auth as string },
          },
          payload
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        // 404/410 は購読が失効している。放置すると毎回失敗し続けるので行ごと消す
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscription.endpoint as string);
        } else {
          failed += 1;
          console.error("Push send failed:", statusCode, error);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({ sent, failed, removed: expiredEndpoints.length });
}
