"use client";

import { useEffect } from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { DataProvider } from "../contexts/DataContext";
import { registerServiceWorker } from "../lib/web-push";

export function Providers({ children }: { children: React.ReactNode }) {
  // Service Worker は PWA のインストール条件であり、Web Push の受信口でもある。
  // 登録だけを行い、通知の許可要求はユーザー操作から別途行う。
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <DataProvider>{children}</DataProvider>
    </AuthProvider>
  );
}
