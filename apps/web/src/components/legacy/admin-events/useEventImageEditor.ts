import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadEventImage, type Language } from '@truss/core';
import { applyMosaicAtPoint } from '../../../lib/mosaicCanvas';

/** 表示中の画像に対する操作モード。mosaic のときだけキャンバスへの描き込みを受け付ける */
export type ImageEditorMode = 'preview' | 'mosaic';

const MAX_HISTORY = 40;
const MAX_CANVAS_WIDTH = 1200;
const MAX_CANVAS_HEIGHT = 700;

interface UseEventImageEditorOptions {
  language: Language;
  /** アップロード先のキー。新規作成でイベントIDが無い間は undefined */
  uploadKey: number | undefined;
  /** 保存できたとき、フォームの画像URLを差し替える */
  onSaved: (url: string) => void;
  /** 画像を外したとき */
  onRemoved: () => void;
}

/**
 * イベント画像のプレビューとモザイク加工。
 * キャンバスの描き込み・取り消し履歴・アップロードをまとめて持ち、表示側は状態を触らずに済むようにする。
 */
export function useEventImageEditor({ language, uploadKey, onSaved, onRemoved }: UseEventImageEditorOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ImageEditorMode>('preview');
  const [source, setSource] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  const open = (nextSource: string, nextMode: ImageEditorMode = 'preview') => {
    setSource(nextSource);
    setMode(nextMode);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSource(null);
    setMode('preview');
    historyRef.current = [];
    setCanUndo(false);
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    setCanUndo(true);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const snapshot = historyRef.current.pop();
    if (!snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    setCanUndo(historyRef.current.length > 0);
  };

  const paintAt = (clientX: number, clientY: number) => {
    if (mode !== 'mosaic') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    applyMosaicAtPoint(canvas, x, y, brushSize);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsProcessing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) {
        toast.error(language === 'ja' ? '画像変換に失敗しました' : 'Failed to process image');
        return;
      }
      const key = uploadKey ?? Date.now();
      const file = new File([blob], `event-${key}.jpg`, { type: 'image/jpeg' });
      const { url, error } = await uploadEventImage(key, file);
      if (error || !url) {
        toast.error(language === 'ja' ? '画像アップロードに失敗しました' : 'Failed to upload image');
        return;
      }
      onSaved(url);
      toast.success(language === 'ja' ? '画像を更新しました' : 'Image updated');
      close();
    } finally {
      setIsProcessing(false);
    }
  };

  const remove = () => {
    onRemoved();
    close();
  };

  /** ファイル選択（フォームの空欄からも、エディタ内のアップロードボタンからも呼ばれる） */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') open(result, 'mosaic');
      // 同じファイルを選び直しても change が起きるようにクリアする。
      // 読み込み完了時には合成イベントの currentTarget が失われているため、要素は先に控えておく
      input.value = '';
    };
    reader.readAsDataURL(file);
  };

  /** 開いている画像をキャンバスへ描く（画面に収まるよう縮小する） */
  useEffect(() => {
    if (!isOpen || !source) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const scale = Math.min(MAX_CANVAS_WIDTH / image.width, MAX_CANVAS_HEIGHT / image.height, 1);
      canvas.width = Math.max(1, Math.floor(image.width * scale));
      canvas.height = Math.max(1, Math.floor(image.height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      historyRef.current = [];
      setCanUndo(false);
    };
    image.src = source;
  }, [isOpen, source]);

  /** Cmd/Ctrl+Z で1つ戻す */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      if (!isUndo) return;
      event.preventDefault();
      undo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  /** キャンバスに渡すハンドラ一式。描き込みの開始・終了は表示側に持たせない */
  const canvasProps = {
    ref: canvasRef,
    onMouseDown: (e: React.MouseEvent) => {
      if (mode !== 'mosaic') return;
      pushHistory();
      isDrawingRef.current = true;
      paintAt(e.clientX, e.clientY);
    },
    onMouseMove: (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      paintAt(e.clientX, e.clientY);
    },
    onMouseUp: () => {
      isDrawingRef.current = false;
    },
    onMouseLeave: () => {
      isDrawingRef.current = false;
    },
  };

  return {
    isOpen,
    source,
    mode,
    setMode,
    brushSize,
    setBrushSize,
    isProcessing,
    canUndo,
    canvasProps,
    open,
    close,
    undo,
    save,
    remove,
    handleFileSelect,
  };
}

export type EventImageEditor = ReturnType<typeof useEventImageEditor>;
