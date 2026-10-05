import { useEffect, useState } from 'react';
import { Heart, Plus, Upload } from '../member/icons';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import type { Language, User } from '@truss/core';
import { useData } from '../../contexts/DataContext';
import { ReactionCount } from './ReactionCount';
import { EmptyState } from './EmptyState';
import { GallerySkeleton } from './LoadingSkeletons';
import { formatHomeDate } from '../member/home-content';
import { HomeSectionState } from '../member/HomePreviews';
import { faImages } from '@fortawesome/free-solid-svg-icons';
import {
  GALLERY_PHOTO_ACCEPT,
  GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE,
  isGalleryPhotoMimeAllowed,
} from '@truss/core';

interface GalleryPageProps {
  language: Language;
  currentUser?: User | null;
  openPhotoId?: number;
  openUpload?: boolean;
  onOpenPhotoHandled?: () => void;
  onOpenUploadHandled?: () => void;
}
const translations = {
  ja: { addPhoto: '写真を追加', selectEvent: 'イベントを選択', cancel: 'キャンセル', add: '追加する' },
  en: { addPhoto: 'Add Photo', selectEvent: 'Select Event', cancel: 'Cancel', add: 'Add' }
};

export function GalleryPage({ language, currentUser, openPhotoId, openUpload, onOpenPhotoHandled, onOpenUploadHandled }: GalleryPageProps) {
  const t = translations[language];
  const { galleryPhotos, events: supabaseEvents, uploadGalleryPhoto, toggleGalleryPhotoLike, likedGalleryPhotoIds, galleryPhotosLoading, homeLoadErrors, retryHomeSection } = useData();
  const [poppingPhotoId, setPoppingPhotoId] = useState<number | null>(null);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(Boolean(openUpload && currentUser?.approved));
  const [selectedPhotoId, setSelectedPhotoId] = useState(openPhotoId);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const detailPhoto = currentUser?.approved ? galleryPhotos.find((photo) => photo.id === selectedPhotoId && photo.approved) : undefined;
  useEffect(() => {
    if (openPhotoId && detailPhoto) onOpenPhotoHandled?.();
  }, [openPhotoId, detailPhoto, onOpenPhotoHandled]);
  useEffect(() => {
    if (openUpload) onOpenUploadHandled?.();
  }, [openUpload, onOpenUploadHandled]);

  // 未承認ユーザーはギャラリーを閲覧不可にする
  if (currentUser && !currentUser.approved) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-gray-900 text-xl font-semibold">{language === 'ja' ? 'ギャラリー' : 'Gallery'}</h1>
        <p className="text-gray-600">
          {language === 'ja'
            ? '承認待ちのため、ギャラリーを閲覧できません。'
            : 'Your account is pending approval, so you cannot access the gallery.'}
        </p>
      </div>
    );
  }

  const events = supabaseEvents.map((e) => ({ id: e.id, name: language === 'ja' ? e.title : (e.titleEn || e.title), date: e.date }));
  const approvedPhotos = galleryPhotos.filter((p) => p.approved);
  const photos = approvedPhotos;

  const toggleLike = async (photoId: number) => {
    if (!approvedPhotos.some((p) => p.id === photoId)) return;
    // いいねを付けた時だけハートを弾ませる(外す時は静かに戻す)
    if (!likedGalleryPhotoIds.has(photoId)) setPoppingPhotoId(photoId);
    await toggleGalleryPhotoLike(photoId);
  };

  const handlePhotoUpload = async () => {
    if (!selectedEvent || selectedFiles.length === 0 || !currentUser) return;
    const selectedEventData = events.find((e) => e.name === selectedEvent);
    if (!selectedEventData) return;
    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        await uploadGalleryPhoto({
          eventId: selectedEventData.id,
          eventName: selectedEventData.name,
          eventDate: selectedEventData.date,
          imageFile: { blob: file, fileName: file.name, contentType: file.type },
          height: 200,
          userId: currentUser.id,
          userName: currentUser.nickname || currentUser.name || 'Unknown',
        });
      }
      setIsAddPhotoOpen(false); setSelectedEvent(''); setSelectedFiles([]); setPreviewUrls([]);
      toast.success(language === 'ja' ? '写真をアップロードしました。運営の承認をお待ちください。' : 'Photos uploaded. Waiting for admin approval.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isMime =
        msg === GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE ||
        /mime type .+ is not supported/i.test(msg);
      toast.error(
        language === 'ja'
          ? isMime
            ? 'JPEG・PNG・WebP・GIF・HEIC/HEIF のみアップロードできます（SVG 等は不可）。'
            : `アップロードに失敗しました: ${msg}`
          : isMime
            ? 'Only JPEG, PNG, WebP, GIF, HEIC/HEIF are allowed (e.g. not SVG).'
            : `Upload failed: ${msg}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (galleryPhotosLoading && photos.length === 0) {
    return (
      <div className="space-y-4 relative">
        <GallerySkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="member-page-heading"><h1>{language === 'ja' ? '思い出のアルバム' : 'Memories'}</h1><Button onClick={() => setIsAddPhotoOpen(true)}><Plus className="w-4 h-4" />{t.addPhoto}</Button></div>
      {homeLoadErrors.memories && photos.length === 0 && <HomeSectionState language={language} error retry={() => void retryHomeSection('memories')} emptyText="" />}
      {photos.length === 0 && !homeLoadErrors.memories && (
        <EmptyState
          icon={faImages}
          title={language === 'ja' ? 'まだ写真がありません' : 'No photos yet'}
        />
      )}
      {/* 列数はウィンドウ幅に追従させる。以前は描画時に一度 window.innerWidth を読むだけで、
          リサイズしても列数が変わらなかった（SSR では常に4列扱いになる問題もあった） */}
      <ResponsiveMasonry columnsCountBreakPoints={{ 0: 2, 768: 3, 1024: 4 }}>
        <Masonry gutter="16px">
          {photos.map((photo) => {
            const isLiked = likedGalleryPhotoIds.has(photo.id);
            return (
              <div key={photo.id} className="member-gallery-item w-full break-inside-avoid">
                <div className="relative">
                  <button type="button" className="block w-full" onClick={() => setSelectedPhotoId(photo.id)} aria-label={`${photo.eventName} ${language === 'ja' ? '写真を見る' : 'View photo'}`}>
                    <img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt="" loading="lazy" decoding="async" className="w-full h-auto block" />
                  </button>
                  <button type="button" onClick={() => void toggleLike(photo.id)} aria-label={language === 'ja' ? (isLiked ? 'いいねを取り消す' : 'いいね') : (isLiked ? 'Unlike' : 'Like')} aria-pressed={isLiked} className={`absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 rounded-full px-2 py-1 shadow-sm min-h-9 ${isLiked ? 'text-pink-600' : 'text-gray-600'}`}>
                    <Heart className={`w-4 h-4 ${poppingPhotoId === photo.id ? 'animate-truss-pop' : ''}`} onAnimationEnd={() => setPoppingPhotoId(null)} /><ReactionCount value={photo.likes} className="text-sm" />
                  </button>
                </div>
                <button type="button" onClick={() => setSelectedPhotoId(photo.id)} className="member-gallery-caption"><span>{photo.eventName}</span><small>{formatHomeDate(photo.eventDate, language)}</small></button>
              </div>
            );
          })}
        </Masonry>
      </ResponsiveMasonry>

      <Dialog open={Boolean(detailPhoto)} onOpenChange={(open) => { if (!open) setSelectedPhotoId(undefined); }}>
        <DialogContent className="sm:max-w-[720px] member-photo-detail" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{detailPhoto?.eventName}</DialogTitle></DialogHeader>
          {detailPhoto && <><img src={typeof detailPhoto.image === 'string' ? detailPhoto.image : detailPhoto.image.src} alt={detailPhoto.eventName} /><p className="text-sm text-muted-foreground">{formatHomeDate(detailPhoto.eventDate, language)} · {detailPhoto.userName}</p></>}
        </DialogContent>
      </Dialog>
      <Dialog open={isAddPhotoOpen} onOpenChange={setIsAddPhotoOpen}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{t.addPhoto}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}><SelectTrigger className="w-full"><SelectValue placeholder={t.selectEvent} /></SelectTrigger><SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.name}>{event.name}</SelectItem>)}</SelectContent></Select>
            <div className="relative"><Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input type="file" accept={GALLERY_PHOTO_ACCEPT} multiple onChange={(e) => { const files = e.target.files; if (!files) return; const list = Array.from(files); const ok = list.filter((f) => isGalleryPhotoMimeAllowed(f.type, f.name)); const bad = list.length - ok.length; if (bad > 0) toast.error(language === 'ja' ? `対応していない形式が ${bad} 件あります（JPEG / PNG / WebP / GIF / HEIC・HEIF）` : `${bad} file(s) skipped — only JPEG, PNG, WebP, GIF, HEIC/HEIF`); if (ok.length === 0) return; setSelectedFiles(ok); setPreviewUrls(ok.map((f) => URL.createObjectURL(f))); }} className="pl-10" /></div>
            {previewUrls.length > 0 && <div className="grid grid-cols-2 gap-4">{previewUrls.map((url, index) => <div key={index} className="relative aspect-square"><img src={url} alt="Preview" className="w-full h-full object-cover" /></div>)}</div>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setIsAddPhotoOpen(false)}>{t.cancel}</Button><Button type="button" disabled={!selectedEvent || selectedFiles.length === 0 || isUploading} onClick={handlePhotoUpload}>{isUploading ? (language === 'ja' ? 'アップロード中...' : 'Uploading...') : t.add}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
