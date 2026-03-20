import { useState } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import type { Language, User } from '../../domain/types/app';
import { ConfirmDialog } from './ConfirmDialog';

interface EditableApplicantDialogProps {
  language: Language;
  application: User;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestReupload?: (userId: string, reasons?: string[]) => void;
}

const translations = {
  ja: { applicantDetails: '申請者詳細', applicationDate: '申請日', studentId: '学生証', personalInfo: '個人情報', name: '名前', furigana: 'フリガナ', studentNumber: '学生番号', birthday: '生年月日', email: 'メールアドレス', category: '区分', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生', major: '学部学科', grade: '学年', save: '保存する', approve: '承認する', reject: '拒否する', requestReupload: '学生証の再アップロードを依頼する', saved: '変更を保存しました', confirmApprove: 'この申請者を承認しますか？', confirmApproveMessage: '承認すると、申請者はメンバーとして登録されます。', confirmReject: 'この申請を拒否しますか？', confirmRejectMessage: 'この操作は取り消せません。', confirmReuploadTitle: '学生証の再アップロードを依頼', confirmReuploadMessage: '学生証が不鮮明または不適切な場合、再アップロードを依頼できます。', reuploadReasonLabel: '再アップロードを依頼する理由', reuploadReasonUnclear: '画像が不鮮明', reuploadReasonNotValid: '本学の学生証ではない', reuploadReasonMismatch: '学生証情報と入力情報が異なる', cancel: 'キャンセル', confirmReuploadButton: '依頼する' },
  en: { applicantDetails: 'Applicant Details', applicationDate: 'Application Date', studentId: 'Student ID Card', personalInfo: 'Personal Information', name: 'Name', furigana: 'Furigana', studentNumber: 'Student Number', birthday: 'Birthday', email: 'Email', category: 'Category', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student', major: 'Major/Department', grade: 'Grade', save: 'Save', approve: 'Approve', reject: 'Reject', requestReupload: 'Request Student ID Re-upload', saved: 'Changes saved successfully', confirmApprove: 'Approve this applicant?', confirmApproveMessage: 'Once approved, the applicant will be registered as a member.', confirmReject: 'Reject this application?', confirmRejectMessage: 'This action cannot be undone.', confirmReuploadTitle: 'Request Student ID Re-upload', confirmReuploadMessage: 'If the student ID is unclear or inappropriate, you can request a re-upload.', reuploadReasonLabel: 'Reason for Re-upload Request', reuploadReasonUnclear: 'Image is unclear', reuploadReasonNotValid: 'Not a valid student ID from this university', reuploadReasonMismatch: 'Student ID information does not match the input information', cancel: 'Cancel', confirmReuploadButton: 'Request' }
};

export function EditableApplicantDialog({ language, application, onApprove, onReject, onRequestReupload }: EditableApplicantDialogProps) {
  const t = translations[language];
  const [formData, setFormData] = useState({ name: application.name, furigana: application.furigana, studentNumber: application.studentNumber, birthday: application.birthday, email: application.email, category: application.category, major: application.major, grade: application.grade });
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showReuploadConfirm, setShowReuploadConfirm] = useState(false);
  const [reuploadReasons, setReuploadReasons] = useState<Set<string>>(new Set());
  const handleInputChange = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const handleSave = () => { console.log('Saving updated data:', formData); toast.success(t.saved); };

  return (
    <>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.applicantDetails}</DialogTitle><DialogDescription>{t.applicationDate}: {application.requestedAt || new Date().toISOString().split('T')[0]}</DialogDescription></DialogHeader>
        <div className="space-y-6">
          <div><h4 className="text-gray-900 mb-2">{t.studentId}</h4><div className="border rounded-lg overflow-hidden" style={{ aspectRatio: '3/2' }}><img src={application.studentIdImage} alt="Student ID" className="w-full h-full object-contain" /></div></div>
          <div>
            <h4 className="text-gray-900 mb-3">{t.personalInfo}</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label htmlFor="name" className="text-gray-600 text-sm">{t.name}</Label><Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="furigana" className="text-gray-600 text-sm">{t.furigana}</Label><Input id="furigana" value={formData.furigana} onChange={(e) => handleInputChange('furigana', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="studentNumber" className="text-gray-600 text-sm">{t.studentNumber}</Label><Input id="studentNumber" value={formData.studentNumber} onChange={(e) => handleInputChange('studentNumber', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="birthday" className="text-gray-600 text-sm">{t.birthday}</Label><Input id="birthday" type="date" value={formData.birthday} onChange={(e) => handleInputChange('birthday', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="email" className="text-gray-600 text-sm">{t.email}</Label><Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="category" className="text-gray-600 text-sm">{t.category}</Label><Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}><SelectTrigger className="mt-1 w-full bg-white"><SelectValue placeholder={t.category} /></SelectTrigger><SelectContent><SelectItem value="japanese">{t.japanese}</SelectItem><SelectItem value="regular-international">{t.regularInternational}</SelectItem><SelectItem value="exchange">{t.exchange}</SelectItem></SelectContent></Select></div>
              <div><Label htmlFor="major" className="text-gray-600 text-sm">{t.major}</Label><Input id="major" value={formData.major} onChange={(e) => handleInputChange('major', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
              <div><Label htmlFor="grade" className="text-gray-600 text-sm">{t.grade}</Label><Input id="grade" value={formData.grade} onChange={(e) => handleInputChange('grade', e.target.value)} className="mt-1 bg-white border-gray-300" /></div>
            </div>
          </div>
          <div className="space-y-2">
            <Button onClick={handleSave} className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">{t.save}</Button>
            <div className="flex gap-2">
              <Button onClick={() => setShowApproveConfirm(true)} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />{t.approve}</Button>
              <Button onClick={() => setShowRejectConfirm(true)} variant="destructive" className="flex-1"><XCircle className="w-4 h-4 mr-2" />{t.reject}</Button>
            </div>
            {!application.studentIdReuploadRequested && onRequestReupload && <Button onClick={() => { setReuploadReasons(new Set()); setShowReuploadConfirm(true); }} variant="outline" className="w-full"><RefreshCw className="w-4 h-4 mr-2" />{t.requestReupload}</Button>}
          </div>
        </div>
      </DialogContent>
      <ConfirmDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm} title={t.confirmApprove} description={t.confirmApproveMessage} confirmText={t.approve} cancelText={t.cancel} onConfirm={() => { onApprove(application.id); setShowApproveConfirm(false); }} onCancel={() => setShowApproveConfirm(false)} />
      <ConfirmDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm} title={t.confirmReject} description={t.confirmRejectMessage} confirmText={t.reject} cancelText={t.cancel} onConfirm={() => { onReject(application.id); setShowRejectConfirm(false); }} onCancel={() => setShowRejectConfirm(false)} variant="destructive" />
      <Dialog open={showReuploadConfirm} onOpenChange={setShowReuploadConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.confirmReuploadTitle}</DialogTitle><DialogDescription>{t.confirmReuploadMessage}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>{t.reuploadReasonLabel}</Label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-[rgba(61,61,78,0.15)] rounded-[12px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"><Checkbox checked={reuploadReasons.has('unclear')} onCheckedChange={() => setReuploadReasons((p) => { const n = new Set(p); n.has('unclear') ? n.delete('unclear') : n.add('unclear'); return n; })} className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white" /><span className="text-[#3D3D4E] text-sm leading-relaxed flex-1">{t.reuploadReasonUnclear}</span></label>
              <label className="flex items-start gap-3 p-4 border border-[rgba(61,61,78,0.15)] rounded-[12px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"><Checkbox checked={reuploadReasons.has('not-valid')} onCheckedChange={() => setReuploadReasons((p) => { const n = new Set(p); n.has('not-valid') ? n.delete('not-valid') : n.add('not-valid'); return n; })} className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white" /><span className="text-[#3D3D4E] text-sm leading-relaxed flex-1">{t.reuploadReasonNotValid}</span></label>
              <label className="flex items-start gap-3 p-4 border border-[rgba(61,61,78,0.15)] rounded-[12px] cursor-pointer hover:bg-[#F9FAFB] transition-colors"><Checkbox checked={reuploadReasons.has('mismatch')} onCheckedChange={() => setReuploadReasons((p) => { const n = new Set(p); n.has('mismatch') ? n.delete('mismatch') : n.add('mismatch'); return n; })} className="mt-0.5 size-5 border-2 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4] data-[state=checked]:text-white" /><span className="text-[#3D3D4E] text-sm leading-relaxed flex-1">{t.reuploadReasonMismatch}</span></label>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowReuploadConfirm(false)}>{t.cancel}</Button><Button onClick={() => { onRequestReupload?.(application.id, Array.from(reuploadReasons)); setShowReuploadConfirm(false); setReuploadReasons(new Set()); }} className="bg-[#49B1E4] hover:bg-[#3A9BD4]">{t.confirmReuploadButton}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
