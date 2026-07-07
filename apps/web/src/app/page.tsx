"use client";

import { Suspense, useLayoutEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../app-shell/AppShell";

/**
 * Supabase / Google の設定によっては Site URL 直下（/?code=...）に戻ることがある。
 * セッション交換は /auth/callback に任せる。
 */
function OAuthCodeForward() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    const q = searchParams.toString();
    router.replace(q ? `/auth/callback?${q}` : "/auth/callback");
  }, [router, searchParams]);

  return null;
}

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <OAuthCodeForward />
      </Suspense>
      <AppShell initialPage="landing" />
    </>
  );
}
