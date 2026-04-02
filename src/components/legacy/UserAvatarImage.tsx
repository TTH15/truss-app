"use client";

import type { CSSProperties } from "react";
import { startTransition, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getAvatarSignedUrl } from "../../lib/supabase";
import { cn } from "../ui/utils";

function getInitials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function UserAvatarImage({
  avatarPath,
  name,
  className,
  fallbackClassName,
  style,
}: {
  avatarPath?: string | null;
  name: string;
  className?: string;
  /** イニシャル表示時のフォールバック用クラス */
  fallbackClassName?: string;
  style?: CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarPath) {
      startTransition(() => setSrc(null));
      return;
    }
    let cancelled = false;
    startTransition(() => setSrc(null));
    void (async () => {
      const { url } = await getAvatarSignedUrl(avatarPath, 3600);
      if (!cancelled) setSrc(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  return (
    <Avatar className={cn(className)} style={style}>
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          className="object-cover"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-linear-to-br from-[#3D3D4E] to-[#6B6B7A] text-white",
          fallbackClassName
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
