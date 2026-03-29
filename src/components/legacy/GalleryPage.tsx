import { useState } from 'react';
import { Heart, Calendar, Plus, Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import Masonry from 'react-responsive-masonry';
import type { Language, User } from '../../domain/types/app';
import { useData } from '../../contexts/DataContext';
import {
  GALLERY_PHOTO_ACCEPT,
  GALLERY_UPLOAD_UNSUPPORTED_MIME_MESSAGE,
  isGalleryPhotoMimeAllowed,
} from '../../lib/db/mutations/gallery';

interface GalleryPageProps { language: Language; currentUser?: User | null; }
const translations = {
  ja: { addPhoto: '写真を追加', selectEvent: 'イベントを選択', cancel: 'キャンセル', add: '追加する' },
  en: { addPhoto: 'Add Photo', selectEvent: 'Select Event', cancel: 'Cancel', add: 'Add' }
};

export function GalleryPage({ language, currentUser }: GalleryPageProps) {
  const t = translations[language];
  const { galleryPhotos, events: supabaseEvents, uploadGalleryPhoto, likeGalleryPhoto } = useData();
  const [likedPhotos, setLikedPhotos] = useState<Set<number>>(new Set());
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
    if (approvedPhotos.some((p) => p.id === photoId) && !likedPhotos.has(photoId)) await likeGalleryPhoto(photoId);
    setLikedPhotos((prev) => { const s = new Set(prev); s.has(photoId) ? s.delete(photoId) : s.add(photoId); return s; });
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
          imageFile: file,
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

  const columns = typeof window !== 'undefined' ? (window.innerWidth < 768 ? 2 : window.innerWidth < 1024 ? 3 : 4) : 4;
  return (
    <div className="space-y-4 relative">
      <Masonry columnsCount={columns} gutter="16px">
        {photos.map((photo) => {
          const isLiked = likedPhotos.has(photo.id);
          return (
            <div key={photo.id} className="w-full overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer break-inside-avoid rounded-lg">
              <div className="relative w-full" style={{ height: `${photo.height}px` }}>
                <img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt={photo.eventName} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"><div className="absolute bottom-0 left-0 right-0 p-3 text-white"><p className="text-sm truncate">{photo.eventName}</p><div className="flex items-center gap-1 text-xs mt-1"><Calendar className="w-3 h-3" />{photo.eventDate}</div></div></div>
                <button onClick={(e) => { e.stopPropagation(); toggleLike(photo.id); }} className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-pink-600 hover:text-pink-700 rounded-full px-2 py-1 shadow-lg"><Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /><span className="text-sm">{photo.likes + (isLiked ? 1 : 0)}</span></button>
              </div>
            </div>
          );
        })}
      </Masonry>

      <button onClick={() => setIsAddPhotoOpen(true)} className="fixed right-6 bottom-24 bg-[#49B1E4] hover:bg-[#3A9FD3] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl z-40" aria-label={t.addPhoto}><Plus className="w-6 h-6" /></button>
      <Dialog open={isAddPhotoOpen} onOpenChange={setIsAddPhotoOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{t.addPhoto}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}><SelectTrigger className="w-full"><SelectValue placeholder={t.selectEvent} /></SelectTrigger><SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.name}>{event.name}</SelectItem>)}</SelectContent></Select>
            <div className="relative"><Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><Input type="file" accept={GALLERY_PHOTO_ACCEPT} multiple onChange={(e) => { const files = e.target.files; if (!files) return; const list = Array.from(files); const ok = list.filter(isGalleryPhotoMimeAllowed); const bad = list.length - ok.length; if (bad > 0) toast.error(language === 'ja' ? `対応していない形式が ${bad} 件あります（JPEG / PNG / WebP / GIF / HEIC・HEIF）` : `${bad} file(s) skipped — only JPEG, PNG, WebP, GIF, HEIC/HEIF`); if (ok.length === 0) return; setSelectedFiles(ok); setPreviewUrls(ok.map((f) => URL.createObjectURL(f))); }} className="pl-10" /></div>
            {previewUrls.length > 0 && <div className="grid grid-cols-2 gap-4">{previewUrls.map((url, index) => <div key={index} className="relative aspect-square"><img src={url} alt="Preview" className="w-full h-full object-cover" /></div>)}</div>}
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setIsAddPhotoOpen(false)}>{t.cancel}</Button><Button type="button" disabled={!selectedEvent || selectedFiles.length === 0 || isUploading} onClick={handlePhotoUpload}>{isUploading ? (language === 'ja' ? 'アップロード中...' : 'Uploading...') : t.add}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
