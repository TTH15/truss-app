"use client";

import { startTransition, useEffect, useState } from "react";
import type { Language } from "@truss/core";
import { getStudentIdSignedUrl } from "@truss/core";

function isDirectImageSrc(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

export function StudentIdImage({
  value,
  alt,
  className,
  language = "ja",
}: {
  value?: string;
  alt: string;
  className?: string;
  language?: Language;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [showLoadError, setShowLoadError] = useState(false);

  useEffect(() => {
    if (!value) {
      startTransition(() => {
        setSrc(null);
        setShowLoadError(false);
      });
      return;
    }
    if (isDirectImageSrc(value)) {
      startTransition(() => {
        setSrc(value);
        setShowLoadError(false);
      });
      return;
    }
    let cancelled = false;
    startTransition(() => {
      setSrc(null);
      setShowLoadError(false);
    });
    void (async () => {
      const { url, error } = await getStudentIdSignedUrl(value, 60 * 10);
      if (cancelled) return;
      if (url) {
        setSrc(url);
        setShowLoadError(false);
        return;
      }
      console.warn("Student ID signed URL failed:", error?.message);
      setSrc(null);
      setShowLoadError(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (showLoadError && value) {
    return (
      <p className="text-sm text-red-600 px-2 py-4 text-center leading-relaxed">
        {language === "ja"
          ? "この写真を表示できませんでした。ログインし直すか、下のボタンでもう一度写真を選び直してください。"
          : "We couldn’t show this photo. Sign in again or pick the photo again with the button below."}
      </p>
    );
  }
  if (!value) {
    return (
      <div className="text-sm text-gray-500 px-2 py-4 text-center leading-relaxed">
        {language === "ja" ? "学生証は未提出です" : "Student ID not submitted"}
      </div>
    );
  }
  if (!src) {
    return (
      <div className="text-sm text-gray-500 px-2 py-4 text-center">
        {language === "ja" ? "読み込み中…" : "Loading…"}
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}

