import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Upload, X, Trash2, Image as ImageIcon, Eye, Sparkles, Undo2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Language } from '../../domain/types/app';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { GALLERY_PHOTO_ACCEPT, isGalleryPhotoMimeAllowed } from '../../lib/db/mutations/gallery';
import { applyMosaicAtPoint } from '../../lib/mosaicCanvas';

interface AdminGalleryProps {
  language: Language;
}

const translations = {
  ja: {
    title: 'ギャラリー管理',
    uploadPhotos: '写真をアップロード',
    selectEvent: 'イベントを選択',
    selectEventPlaceholder: 'イベントを選んでください',
    choosePhotos: '写真を選択',
    upload: 'アップロード',
    cancel: 'キャンセル',
    allEvents: 'すべてのイベント',
    filterByEvent: 'イベントで絞り込み',
    photos: '枚',
    deletePhoto: '写真を削除',
    confirmDelete: 'この写真を削除しますか？',
    uploadSuccess: '写真をアップロードしました',
    deleteSuccess: '写真を削除しました',
    noPhotos: '写真がありません',
    uploadedBy: 'アップロード者:',
    mosaicHint: '各サムネの「モザイク」で顔などに塗りつぶしをかけてからアップロードできます。',
    mosaic: 'モザイク',
    preview: 'プレビュー',
    brush: 'ブラシ',
    undo: '1つ戻す (Cmd/Ctrl+Z)',
    applySave: '反映',
    removeFromSelection: '選択から外す',
    imageProcessFailed: '画像変換に失敗しました',
    mosaicApplied: '編集を反映しました',
  },
  en: {
    title: 'Gallery Management',
    uploadPhotos: 'Upload Photos',
    selectEvent: 'Select Event',
    selectEventPlaceholder: 'Choose an event',
    choosePhotos: 'Choose Photos',
    upload: 'Upload',
    cancel: 'Cancel',
    allEvents: 'All Events',
    filterByEvent: 'Filter by Event',
    photos: 'photos',
    deletePhoto: 'Delete Photo',
    confirmDelete: 'Are you sure you want to delete this photo?',
    uploadSuccess: 'Photos uploaded successfully',
    deleteSuccess: 'Photo deleted successfully',
    noPhotos: 'No photos',
    uploadedBy: 'Uploaded by:',
    mosaicHint: 'Use “Mosaic” on each thumbnail to blur faces before upload.',
    mosaic: 'Mosaic',
    preview: 'Preview',
    brush: 'Brush',
    undo: 'Undo (Cmd/Ctrl+Z)',
    applySave: 'Apply',
    removeFromSelection: 'Remove from selection',
    imageProcessFailed: 'Failed to process image',
    mosaicApplied: 'Edits applied',
  },
};

export function AdminGallery({ language }: AdminGalleryProps) {
  const t = translations[language];
  const { user: authUser } = useAuth();
  const { galleryPhotos, events: supabaseEvents, uploadGalleryPhoto, deleteGalleryPhoto } = useData();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);

  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageEditorMode, setImageEditorMode] = useState<'preview' | 'mosaic'>('preview');
  const [imageEditorSource, setImageEditorSource] = useState<string | null>(null);
  const [mosaicBrushSize, setMosaicBrushSize] = useState(20);
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const imageHistoryRef = useRef<ImageData[]>([]);
  const [canUndoImageEdit, setCanUndoImageEdit] = useState(false);

  const events = supabaseEvents.length > 0
    ? supabaseEvents.map((e) => ({ id: e.id.toString(), titleJa: e.title, titleEn: e.titleEn || e.title, date: e.date }))
    : [
        { id: 'event-1', titleJa: '国際料理大会', titleEn: 'International Cooking Contest', date: '2026-04-01' },
        { id: 'event-2', titleJa: 'スポーツ大会', titleEn: 'Sports Day', date: '2026-04-01' },
        { id: 'event-3', titleJa: 'お花見大会', titleEn: 'Cherry Blossom Party', date: '2026-04-15' },
      ];

  const photos = galleryPhotos;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const ok = files.filter(isGalleryPhotoMimeAllowed);
    const bad = files.length - ok.length;
    if (bad > 0) {
      toast.error(language === 'ja' ? `対応していない形式が ${bad} 件あります（JPEG / PNG / WebP / GIF / HEIC・HEIF）` : `${bad} file(s) skipped — only JPEG, PNG, WebP, GIF, HEIC/HEIF`);
    }
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles(ok);
    setPreviewUrls(ok.map((file) => URL.createObjectURL(file)));
  };

  const openImageEditorForFile = (index: number) => {
    const file = selectedFiles[index];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setEditingFileIndex(index);
        setImageEditorSource(result);
        setImageEditorMode('mosaic');
        setImageEditorOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const closeImageEditor = () => {
    setImageEditorOpen(false);
    setImageEditorSource(null);
    setImageEditorMode('preview');
    setEditingFileIndex(null);
    imageHistoryRef.current = [];
    setCanUndoImageEdit(false);
  };

  const pushImageHistory = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imageHistoryRef.current.push(snapshot);
    if (imageHistoryRef.current.length > 40) imageHistoryRef.current.shift();
    setCanUndoImageEdit(true);
  };

  const undoImageEdit = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = imageHistoryRef.current.pop();
    if (!snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    setCanUndoImageEdit(imageHistoryRef.current.length > 0);
  };

  const handleCanvasPointer = (clientX: number, clientY: number) => {
    if (imageEditorMode !== 'mosaic') return;
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    applyMosaicAtPoint(canvas, x, y, mosaicBrushSize);
  };

  const saveEditedGalleryImage = async () => {
    const canvas = imageCanvasRef.current;
    if (!canvas || editingFileIndex === null) return;
    setIsImageProcessing(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) {
        toast.error(t.imageProcessFailed);
        return;
      }
      const file = new File([blob], `gallery-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const idx = editingFileIndex;
      setSelectedFiles((prev) => {
        const next = [...prev];
        next[idx] = file;
        return next;
      });
      setPreviewUrls((prev) => {
        const next = [...prev];
        URL.revokeObjectURL(prev[idx]);
        next[idx] = URL.createObjectURL(file);
        return next;
      });
      toast.success(t.mosaicApplied);
      closeImageEditor();
    } finally {
      setIsImageProcessing(false);
    }
  };

  const handleReplaceImageInEditor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editingFileIndex === null) return;
    if (!isGalleryPhotoMimeAllowed(file)) {
      toast.error(language === 'ja' ? 'この形式は使えません' : 'Unsupported file type');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setImageEditorSource(result);
      }
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const removeCurrentFromSelection = () => {
    if (editingFileIndex === null) return;
    const idx = editingFileIndex;
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      URL.revokeObjectURL(prev[idx]);
      return next;
    });
    closeImageEditor();
  };

  useEffect(() => {
    if (!imageEditorOpen || !imageEditorSource) return;
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const maxWidth = 1200;
      const maxHeight = 700;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      canvas.width = Math.max(1, Math.floor(image.width * scale));
      canvas.height = Math.max(1, Math.floor(image.height * scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      imageHistoryRef.current = [];
      setCanUndoImageEdit(false);
    };
    image.src = imageEditorSource;
  }, [imageEditorOpen, imageEditorSource]);

  useEffect(() => {
    if (!imageEditorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      if (!isUndo) return;
      event.preventDefault();
      undoImageEdit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageEditorOpen]);

  const handleUpload = async () => {
    if (!selectedEventId) return toast.error(language === 'ja' ? 'イベントを選択してください' : 'Please select an event');
    if (selectedFiles.length === 0) return toast.error(language === 'ja' ? '写真を選択してください' : 'Please select photos');
    if (!authUser?.id) {
      return toast.error(language === 'ja' ? 'ログイン情報を取得できませんでした' : 'Could not resolve your user id');
    }
    setIsUploading(true);
    const event = events.find((e) => e.id === selectedEventId);
    const eventIdNum = parseInt(selectedEventId, 10);
    if (Number.isNaN(eventIdNum)) {
      setIsUploading(false);
      return toast.error(language === 'ja' ? '有効なイベントを選択してください' : 'Please choose a valid event');
    }
    try {
      for (const file of selectedFiles) {
        await uploadGalleryPhoto({
          eventId: eventIdNum,
          eventName: language === 'ja' ? (event?.titleJa || '') : (event?.titleEn || ''),
          eventDate: event?.date || new Date().toISOString().split('T')[0],
          imageFile: file,
          height: 200,
          userId: authUser.id,
          userName: authUser.nickname || authUser.name || (language === 'ja' ? '運営管理者' : 'Admin'),
        });
      }
      toast.success(t.uploadSuccess);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      handleCancelUpload();
    } catch {
      toast.error(language === 'ja' ? 'アップロードに失敗しました' : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setShowUploadForm(false);
    setSelectedEventId('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    closeImageEditor();
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (window.confirm(t.confirmDelete)) {
      await deleteGalleryPhoto(photoId);
      toast.success(t.deleteSuccess);
    }
  };

  const filteredPhotos = filterEventId === 'all' ? photos : photos.filter((p) => p.eventId.toString() === filterEventId);
  const photoCountByEvent = photos.reduce((acc, photo) => {
    const k = photo.eventId.toString();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><p className="text-[#6B6B7A] text-sm">{filteredPhotos.length} {t.photos}</p></div>
        {!showUploadForm && <Button onClick={() => setShowUploadForm(true)} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white gap-2"><Upload className="w-4 h-4" />{t.uploadPhotos}</Button>}
      </div>

      {showUploadForm && (
        <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-[#3D3D4E] font-semibold">{t.uploadPhotos}</h3><button type="button" onClick={handleCancelUpload} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors"><X className="w-5 h-5" /></button></div>
          <div>
            <label className="text-[#3D3D4E] text-sm font-medium block mb-2">{t.selectEvent}</label>
            <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="w-full bg-[#EEEBE3] border-0 rounded-[8px] px-4 py-2 text-[#3D3D4E]">
              <option value="">{t.selectEventPlaceholder}</option>
              {events.map((event) => <option key={event.id} value={event.id}>{language === 'ja' ? event.titleJa : event.titleEn} ({event.date})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#3D3D4E] text-sm font-medium block mb-2">{t.choosePhotos}</label>
            <label className="cursor-pointer"><div className="bg-[#F5F1E8] border-2 border-dashed border-[rgba(61,61,78,0.2)] rounded-[8px] p-8 flex flex-col items-center justify-center hover:bg-[#EEEBE3] transition-colors"><Upload className="w-8 h-8 text-[#3D3D4E] mb-2" /><span className="text-[#3D3D4E] text-sm">{selectedFiles.length > 0 ? `${selectedFiles.length} ${t.photos}` : t.choosePhotos}</span></div><input type="file" accept={GALLERY_PHOTO_ACCEPT} multiple onChange={handleFileSelect} className="hidden" /></label>
            <p className="text-[#6A7282] text-xs mt-2">{t.mosaicHint}</p>
          </div>
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative aspect-square rounded-[8px] overflow-hidden border border-[rgba(61,61,78,0.15)] group">
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 hidden sm:flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none group-hover:pointer-events-auto">
                    <Button type="button" size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 shadow-md pointer-events-auto" onClick={() => openImageEditorForFile(index)}>
                      <Sparkles className="w-4 h-4 mr-1" />
                      {t.mosaic}
                    </Button>
                  </div>
                  <Button type="button" size="icon" variant="secondary" className="absolute bottom-2 right-2 h-9 w-9 shadow-md sm:hidden" onClick={() => openImageEditorForFile(index)} aria-label={t.mosaic}>
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2"><Button onClick={handleUpload} disabled={isUploading} className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-white">{isUploading ? (language === 'ja' ? 'アップロード中...' : 'Uploading...') : t.upload}</Button><Button onClick={handleCancelUpload} variant="outline" className="flex-1 bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB]">{t.cancel}</Button></div>
        </div>
      )}

      <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4">
        <label className="text-[#3D3D4E] text-sm font-medium block mb-2">{t.filterByEvent}</label>
        <select value={filterEventId} onChange={(e) => setFilterEventId(e.target.value)} className="w-full md:w-auto bg-[#EEEBE3] border-0 rounded-[8px] px-4 py-2 text-[#3D3D4E]">
          <option value="all">{t.allEvents}</option>
          {events.map((event) => <option key={event.id} value={event.id}>{language === 'ja' ? event.titleJa : event.titleEn}{photoCountByEvent[event.id] ? ` (${photoCountByEvent[event.id]})` : ''}</option>)}
        </select>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-12 text-center"><ImageIcon className="w-12 h-12 text-[#6B6B7A] mx-auto mb-4 opacity-40" /><p className="text-[#6B6B7A]">{t.noPhotos}</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group relative bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] overflow-hidden aspect-square">
              <img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt={photo.eventName} className="w-full h-full object-cover" />
              {!photo.approved && <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">{language === 'ja' ? '承認待ち' : 'Pending'}</div>}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100">
                <div><p className="text-white text-sm font-medium mb-1">{photo.eventName}</p><p className="text-white text-xs opacity-80">{new Date(photo.uploadedAt).toLocaleString()}</p><p className="text-white text-xs opacity-80">{t.uploadedBy} {photo.userName}</p></div>
                <button type="button" onClick={() => handleDeletePhoto(photo.id)} className="bg-[#D4183D] hover:bg-[#B01535] text-white px-3 py-2 rounded-[8px] flex items-center justify-center gap-2 transition-colors"><Trash2 className="w-4 h-4" /><span className="text-sm">{t.deletePhoto}</span></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {imageEditorOpen && imageEditorSource && (
        <div
          className="fixed inset-0 z-90 bg-black/70 flex items-center justify-center p-4"
          onClick={closeImageEditor}
          role="presentation"
        >
          <div className="relative w-full max-w-[95vw] max-h-[95vh] bg-[#111827] rounded-xl border border-white/10 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  title={t.undo}
                  className="text-lg text-white/60 hover:text-white transition-colors disabled:opacity-30"
                  onClick={undoImageEdit}
                  disabled={!canUndoImageEdit}
                >
                  <Undo2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  title={t.preview}
                  className={`text-lg transition-colors ${imageEditorMode === 'preview' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                  onClick={() => setImageEditorMode('preview')}
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  title={t.mosaic}
                  className={`text-lg transition-colors ${imageEditorMode === 'mosaic' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                  onClick={() => setImageEditorMode('mosaic')}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                {imageEditorMode === 'mosaic' && (
                  <div className="flex items-center gap-2 text-white text-xs">
                    <span>{t.brush}</span>
                    <input
                      type="range"
                      min={6}
                      max={48}
                      value={mosaicBrushSize}
                      onChange={(e) => setMosaicBrushSize(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer text-white/60 hover:text-white transition-colors text-lg">
                  <input type="file" accept={GALLERY_PHOTO_ACCEPT} onChange={handleReplaceImageInEditor} className="hidden" />
                  <span title={t.uploadPhotos}><Upload className="w-5 h-5" /></span>
                </label>
                <button
                  type="button"
                  title={t.removeFromSelection}
                  className="text-lg text-white/60 hover:text-red-400 transition-colors"
                  onClick={removeCurrentFromSelection}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  title={t.applySave}
                  className="text-lg text-white/60 hover:text-[#49B1E4] transition-colors disabled:opacity-40"
                  disabled={isImageProcessing}
                  onClick={() => void saveEditedGalleryImage()}
                >
                  <Save className={`w-5 h-5 ${isImageProcessing ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[78vh] rounded-lg bg-black/50 flex items-center justify-center touch-none">
              <canvas
                ref={imageCanvasRef}
                className={`max-w-full max-h-[78vh] ${imageEditorMode === 'mosaic' ? 'cursor-crosshair' : 'cursor-default'}`}
                onPointerDown={(e) => {
                  if (imageEditorMode !== 'mosaic') return;
                  pushImageHistory();
                  isDrawingRef.current = true;
                  (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
                  handleCanvasPointer(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!isDrawingRef.current) return;
                  handleCanvasPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  isDrawingRef.current = false;
                }}
                onPointerCancel={() => {
                  isDrawingRef.current = false;
                }}
              />
            </div>
            <button type="button" onClick={closeImageEditor} className="absolute -top-10 right-0 text-white hover:text-gray-200" aria-label="close">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
