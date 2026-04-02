"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { getCroppedImgAsJpegBlob } from "../../lib/avatar-crop";
import type { Language } from "../../domain/types/app";

const translations = {
  ja: {
    title: "プロフィール画像",
    pick: "写真を選ぶ",
    zoom: "拡大",
    cancel: "キャンセル",
    apply: "この範囲で保存",
    hint: "ドラッグして位置を調整してください",
    converting: "変換中…",
  },
  en: {
    title: "Profile photo",
    pick: "Choose photo",
    zoom: "Zoom",
    cancel: "Cancel",
    apply: "Save",
    hint: "Drag to adjust position",
    converting: "Converting…",
  },
};

async function fileToObjectUrl(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  const isHeic =
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif";
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(out) ? out[0] : out;
    return URL.createObjectURL(blob);
  }
  return URL.createObjectURL(file);
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

interface ProfileAvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  onComplete: (jpegBlob: Blob) => void | Promise<void>;
}

export function ProfileAvatarCropDialog({
  open,
  onOpenChange,
  language,
  onComplete,
}: ProfileAvatarCropDialogProps) {
  const t = translations[language];
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const resetAndClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setImageSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isImageFile(file)) return;
    setConverting(true);
    try {
      const url = await fileToObjectUrl(file);
      setImageSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } finally {
      setConverting(false);
    }
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setPending(true);
    try {
      const blob = await getCroppedImgAsJpegBlob(imageSrc, croppedAreaPixels);
      await onComplete(blob);
      resetAndClose(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={handleFile}
        />

        {!imageSrc ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Button
              type="button"
              variant="outline"
              disabled={converting}
              onClick={() => inputRef.current?.click()}
            >
              {converting ? t.converting : t.pick}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{t.hint}</p>
            <div className="relative h-64 w-full overflow-hidden rounded-lg bg-black/5">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="space-y-2 px-1">
              <p className="text-muted-foreground text-sm">{t.zoom}</p>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
              />
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => resetAndClose(false)}>
            {t.cancel}
          </Button>
          {imageSrc ? (
            <Button type="button" disabled={pending || !croppedAreaPixels} onClick={() => void handleApply()}>
              {t.apply}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
