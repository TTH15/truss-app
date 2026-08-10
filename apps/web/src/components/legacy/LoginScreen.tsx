"use client";

import { useEffect, useState } from "react";
import type { Language } from "@truss/core";
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { isInAppBrowser, isLineInAppBrowser, getLineEscapeUrl } from "../../lib/in-app-browser";

interface LoginScreenProps {
  onLogin: () => void;
  onAdminLogin?: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LoginScreen({
  onLogin,
  onAdminLogin,
  language,
  onLanguageChange,
}: LoginScreenProps) {
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // LINE 等のアプリ内ブラウザでは Google ログインが必ず失敗する（Google が WebView を拒否する）。
  // UA 判定はサーバーでは出来ないため、マウント後に判定して案内を出す
  const [inAppBrowser, setInAppBrowser] = useState<'line' | 'other' | null>(null);
  useEffect(() => {
    if (!isInAppBrowser()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部環境（UA）の判定はマウント後にしか出来ない
    setInAppBrowser(isLineInAppBrowser() ? 'line' : 'other');
  }, []);

  const privacyHref = "/privacy-policy";
  const termsHref = "/terms-of-service";

  const handleStart = () => {
    // アプリ内ブラウザでは Google の同意画面自体が開けないので、開始させずに案内する
    if (inAppBrowser) return;
    if (!acceptedAgreement) {
      setError(language === "ja" ? "上記に同意してから開始してください。" : "Please agree to the terms of service and privacy policy to continue.");
      return;
    }
    setError(null);
    onLogin();
  };

  return (
    <div className="w-full h-screen relative bg-[#F5F1E8] flex flex-col items-center justify-center">
      <div className="absolute top-7 right-4 z-10">
        <button
          onClick={() => onLanguageChange(language === "ja" ? "en" : "ja")}
          className="bg-[#3D3D4E] text-[#F5F1E8] px-3 py-2 rounded-lg text-sm font-medium"
        >
          {language === "ja" ? "English" : "日本語"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-8 -mt-3">
        <img
          src="/Truss/3.svg"
          alt="Truss"
          className="w-[320px] h-auto select-none"
          draggable={false}
        />

        {/* Google のブランド審査要件: OAuth のアプリ名と同じ表記と、アプリの目的の説明をページに載せる */}
        <div className="max-w-md px-6 text-center space-y-1.5 -mt-2">
          <p className="text-[#3D3D4E] text-base font-semibold tracking-[-0.3125px]">
            {language === "ja" ? "Truss公式アプリ" : "Truss Official App"}
          </p>
          <p className="text-[#6B6B7A] text-sm leading-relaxed">
            {language === "ja"
              ? "神戸大学 留学生支援サークル Truss の公式アプリです。イベントの案内と参加登録、会員どうしの交流、運営への連絡ができます。"
              : "The official app of Truss, the international student support club at Kobe University. Browse and join events, connect with members, and contact the staff."}
          </p>
        </div>

        {inAppBrowser && (
          <div className="w-full max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-sm leading-relaxed text-[#3D3D4E]">
                {language === "ja"
                  ? "アプリ内ブラウザでは Google ログインをご利用いただけません。Safari や Chrome などのブラウザで開いてください。"
                  : "Google sign-in is not available in in-app browsers. Please open this page in Safari or Chrome."}
              </p>
            </div>
            {inAppBrowser === 'line' ? (
              <Button
                className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3] text-white"
                onClick={() => {
                  window.location.href = getLineEscapeUrl();
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {language === "ja" ? "ブラウザで開き直す" : "Open in browser"}
              </Button>
            ) : (
              <p className="text-xs text-[#6B6B7A] leading-relaxed">
                {language === "ja"
                  ? "画面右上（または右下）のメニューから「ブラウザで開く」を選んでください。"
                  : "Use the menu (usually top-right) and choose “Open in browser”."}
              </p>
            )}
          </div>
        )}

        <div className="w-full max-w-md pb-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white mt-0.5"
              checked={acceptedAgreement}
              onCheckedChange={(v) => setAcceptedAgreement(v === true)}
            />
            <span className="text-[#3D3D4E] text-sm leading-relaxed">
              {language === "ja" ? (
                <>
                  <Link
                    href={privacyHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                  >
                    プライバシーポリシー
                  </Link>
                  および
                  <Link
                    href={termsHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                  >
                    利用規約
                  </Link>
                  に同意します
                </>
              ) : (
                <>
                  I agree to the{" "}
                  <Link
                    href={privacyHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={termsHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                  >
                    Terms of Service
                  </Link>
                </>
              )}
            </span>
          </label>

          {error && (
            <p className="ml-7 mt-2 text-xs text-red-600 font-medium leading-snug">
              {error}
            </p>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={!!inAppBrowser}
          className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-white border border-[#DADCE0] rounded-full py-3.5 px-6 shadow-sm transition-shadow hover:shadow-md active:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5 shrink-0"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: "block" }}
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
          </svg>
          <span className="text-[#3D3D4E] text-base font-semibold tracking-[-0.3125px]">
            {language === "ja" ? "Google でログイン" : "Sign in with Google"}
          </span>
        </button>
      </div>

      {onAdminLogin && (
        <div className="absolute bottom-10 left-10">
          <Button
            onClick={onAdminLogin}
            className="bg-[#3D3D4E] text-[#F5F1E8] px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Shield className="mr-2" />
            {language === "ja" ? "管理者ログイン" : "Admin Login"}
          </Button>
        </div>
      )}
    </div>
  );
}
