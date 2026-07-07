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
      setError(language === "ja" ? "上記に同意してから開始してください。" : "Please agree to the terms of service and privacy policy to continue.");
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

      <div className="flex flex-col items-center gap-8 -mt-3">
        <img
          src="/Truss/3.svg"
          alt="Truss"
          className="w-[320px] h-auto select-none"
          draggable={false}
        />

        <div
          className="w-full max-w-md pb-6"
          onClick={(e) => e.stopPropagation()}
        >
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    プライバシーポリシー
                  </Link>
                  および
                  <Link
                    href={termsHref}
                    className="text-[#49B1E4] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
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
            <p className="ml-7 mt-2 text-xs text-red-600 font-medium leading-snug">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="font-semibold leading-[28px] not-italic text-[#3d3d4e] text-[18px] text-center tracking-[-0.4395px] w-[283px]">
            {language === "ja" ? "画面をタップして始める" : "Tap to start"}
          </p>

          <p className="leading-[28px] font-semibold not-italic text-[#3d3d4e] text-[15px] text-center tracking-[-0.4395px] flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
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
