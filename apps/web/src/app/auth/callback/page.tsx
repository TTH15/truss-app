"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      const error = searchParams.get("error");
      const code = searchParams.get("code");

      if (error) {
        router.replace("/login");
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          router.replace("/login");
          return;
        }
      }

      // detectSessionInUrl=true のため、hash ベースの callback でもここで session 回復を待てる
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (sessionError || !data.session) {
        router.replace("/login");
        return;
      }

      // LegacyApp がセッションと users 行の有無に応じて dashboard / 初期登録へ振り分ける
      router.replace("/");
    };

    void handleCallback();
    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-600">認証を処理中です...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-gray-600">認証を処理中です...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
