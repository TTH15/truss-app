"use client";

import { startTransition, useEffect, useState } from "react";
import { getStudentIdSignedUrl } from "../../lib/supabase";

function isDirectImageSrc(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:");
}

export function StudentIdImage({
  value,
  alt,
  className,
}: {
  value?: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      startTransition(() => setSrc(null));
      return;
    }
    if (isDirectImageSrc(value)) {
      startTransition(() => setSrc(value));
      return;
    }
    let cancelled = false;
    startTransition(() => setSrc(null));
    void (async () => {
      const { url } = await getStudentIdSignedUrl(value, 60 * 10);
      if (!cancelled) setSrc(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return <div className="text-sm text-gray-500">No image</div>;
  }
  return <img src={src} alt={alt} className={className} />;
}

