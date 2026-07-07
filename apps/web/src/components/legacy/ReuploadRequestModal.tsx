import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { useState } from 'react';
import type { Language } from '../../domain/types/app';

interface ReuploadRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (reasons: string[]) => void;
  language: Language;
  userName: string;
}

const translations = {
  ja: { title: 'アップロード再依頼', subtitle: '再依頼の理由を選択してください', reason1: '規定の学生証の画像ではない。', reason2: '画質が荒く、情報が読み取れない。', cancel: 'キャンセル', send: '送信する', selectReason: '理由を選択してください' },
  en: { title: 'Request Re-upload', subtitle: 'Please select the reason(s)', reason1: 'Not a valid student ID image.', reason2: 'Image quality is too low to read information.', cancel: 'Cancel', send: 'Send', selectReason: 'Please select at least one reason' }
};

export function ReuploadRequestModal({ isOpen, onClose, onSend, language, userName }: ReuploadRequestModalProps) {
  const t = translations[language];
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  if (!isOpen) return null;

  const handleToggleReason = (reason: string) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(reason)) next.delete(reason); else next.add(reason);
      return next;
    });
  };

  const handleSend = () => {
    if (selectedReasons.size === 0) { alert(t.selectReason); return; }
    onSend(Array.from(selectedReasons));
    setSelectedReasons(new Set());
    onClose();
  };

  const handleClose = () => { setSelectedReasons(new Set()); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <div><h2 className="text-[#101828] text-lg font-semibold">{t.title}</h2><p className="text-[#6B6B7A] text-sm mt-1">{userName}</p></div>
          <button onClick={handleClose} className="text-[#6B6B7A] hover:text-[#3D3D4E] transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[#3D3D4E] text-sm font-medium">{t.subtitle}</p>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border border-[rgba(61,61,78,0.15)] rounded-[12px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"><Checkbox checked={selectedReasons.has('reason1')} onCheckedChange={() => handleToggleReason('reason1')} className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white" /><span className="text-[#3D3D4E] text-sm leading-relaxed flex-1">{t.reason1}</span></label>
            <label className="flex items-start gap-3 p-4 border border-[rgba(61,61,78,0.15)] rounded-[12px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"><Checkbox checked={selectedReasons.has('reason2')} onCheckedChange={() => handleToggleReason('reason2')} className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white" /><span className="text-[#3D3D4E] text-sm leading-relaxed flex-1">{t.reason2}</span></label>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-[#E5E7EB]">
          <Button onClick={handleClose} variant="outline" className="flex-1 bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-11">{t.cancel}</Button>
          <Button onClick={handleSend} className="flex-1 bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-11">{t.send}</Button>
        </div>
      </div>
    </div>
  );
}
