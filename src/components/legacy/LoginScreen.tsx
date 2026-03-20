"use client";

import type { Language } from "../../domain/types/app";
import { Shield } from "lucide-react";
import { Button } from "../ui/button";

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
  return (
    <div
      onClick={onLogin}
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
