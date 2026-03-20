import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import type { Language, GalleryPhoto } from '../../domain/types/app';
import { useData } from '../../contexts/DataContext';

interface AdminGalleryApprovalsProps { language: Language; }

const translations = {
  ja: { title: '写真承認待ち', noApprovals: '承認待ちの写真はありません', approve: '承認する', reject: '拒否する', approved: '写真を承認しました', rejected: '写真を拒否しました' },
  en: { title: 'Pending Photo Approvals', noApprovals: 'No pending photo approvals', approve: 'Approve', reject: 'Reject', approved: 'Photo approved', rejected: 'Photo rejected' }
};

export function AdminGalleryApprovals({ language }: AdminGalleryApprovalsProps) {
  const t = translations[language];
  const { galleryPhotos, approveGalleryPhoto, deleteGalleryPhoto } = useData();
  const pendingPhotos = galleryPhotos.filter((p) => !p.approved);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (photoId: number) => {
    setIsProcessing(true);
    try { await approveGalleryPhoto(photoId); toast.success(t.approved); setSelectedPhoto(null); }
    finally { setIsProcessing(false); }
  };
  const handleReject = async (photoId: number) => {
    setIsProcessing(true);
    try { await deleteGalleryPhoto(photoId); toast.error(t.rejected); setSelectedPhoto(null); }
    finally { setIsProcessing(false); }
  };

  if (pendingPhotos.length === 0) return <div className="text-center py-12"><CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">{t.noApprovals}</p></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-gray-900">{t.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingPhotos.map((photo) => (
          <Card key={photo.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="relative w-full h-48 mb-3 rounded-lg overflow-hidden bg-gray-100" onClick={() => setSelectedPhoto(photo)}>
                <img src={typeof photo.image === 'string' ? photo.image : photo.image.src} alt={photo.eventName} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600"><User className="w-4 h-4" /><span>{photo.userName}</span></div>
                <div className="text-sm"><Badge variant="secondary">{photo.eventName}</Badge></div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="w-4 h-4" /><span>{photo.eventDate}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={(e) => { e.stopPropagation(); handleApprove(photo.id); }} size="sm" disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />{t.approve}</Button>
                <Button onClick={(e) => { e.stopPropagation(); handleReject(photo.id); }} size="sm" variant="destructive" disabled={isProcessing} className="flex-1"><XCircle className="w-4 h-4 mr-2" />{t.reject}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{selectedPhoto?.eventName}</DialogTitle></DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img src={typeof selectedPhoto.image === 'string' ? selectedPhoto.image : selectedPhoto.image.src} alt={selectedPhoto.eventName} className="w-full h-auto rounded-lg" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600"><User className="w-4 h-4" /><span>{selectedPhoto.userName}</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="w-4 h-4" /><span>{selectedPhoto.eventDate}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApprove(selectedPhoto.id)} disabled={isProcessing} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />{t.approve}</Button>
                  <Button onClick={() => handleReject(selectedPhoto.id)} variant="destructive" disabled={isProcessing}><XCircle className="w-4 h-4 mr-2" />{t.reject}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
