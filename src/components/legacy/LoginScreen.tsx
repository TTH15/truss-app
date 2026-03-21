"use client";

import { useState } from "react";
import type { Language } from "../../domain/types/app";
import { Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

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

  const privacyHref = "/privacy-policy";
  const termsHref = "/terms-of-service";

  const handleStart = () => {
    if (!acceptedAgreement) {
      setError(language === "ja" ? "チェックボックスに同意してから開始してください。" : "Please agree using the checkboxes to continue.");
      return;
    }
    setError(null);
    onLogin();
  };

  return (
    <div
      onClick={handleStart}
      className="cursor-pointer w-full h-screen relative bg-[#F5F1E8] flex flex-col items-center justify-center"
    >
      <div className="absolute top-7 right-4 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLanguageChange(language === "ja" ? "en" : "ja");
          }}
          className="bg-[#3D3D4E] text-[#F5F1E8] px-3 py-2 rounded-lg text-sm font-medium"
        >
          {language === "ja" ? "English" : "日本語"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-8 -mt-6">
        <img
          src="/Truss/3.svg"
          alt="Truss"
          className="w-[320px] h-auto select-none"
          draggable={false}
        />

        <div
          className="w-full max-w-md px-6"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={acceptedAgreement}
              onCheckedChange={(v) => setAcceptedAgreement(v === true)}
            />
            <span className="text-[#3D3D4E] text-sm leading-relaxed">
              {language === "ja" ? (
                <>
                  <Link
                    href={privacyHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    プライバシーポリシー（リンク）
                  </Link>
                  および
                  <Link
                    href={termsHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    利用規約（リンク）
                  </Link>
                  に同意します
                </>
              ) : (
                <>
                  I agree to the{" "}
                  <Link
                    href={privacyHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link
                    href={termsHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </Link>
                </>
              )}
            </span>
          </label>

          {error && (
            <p className="mt-2 text-xs text-red-600 font-medium leading-snug">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="font-semibold leading-[28px] not-italic text-[#3d3d4e] text-[18px] text-center tracking-[-0.4395px] w-[283px]">
            {language === "ja" ? "画面をタップして始める" : "Tap to start"}
          </p>

          <p className="leading-[28px] font-semibold not-italic text-[#3d3d4e] text-[15px] text-center tracking-[-0.4395px]">
            {language === "ja" ? "Googleアカウントを利用します" : "Use Google Account"}
          </p>
        </div>
      </div>

      {onAdminLogin && (
        <div className="absolute bottom-10 left-10">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdminLogin();
            }}
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
