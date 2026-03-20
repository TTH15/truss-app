import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { CheckCircle, Calendar, RefreshCw, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ConfirmDialog } from './ConfirmDialog';
import { EditableApplicantDialog } from './EditableApplicantDialog';
import { toast } from 'sonner';
import type { Language, User } from '../../domain/types/app';

interface AdminApprovalsProps {
  language: Language;
  pendingUsers?: User[];
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  onRequestReupload?: (userId: string, reasons?: string[]) => void;
}

const translations = {
  ja: { title: '会員登録承認待ち', noApprovals: '承認待ちの登録はありません', viewDetails: '確認する', studentId: '学生証', applicationDate: '申請日', approved: '承認されました', rejected: '拒否されました', reuploadRequested: '再アップロード依頼中', confirmApprove: 'この申請者を承認しますか？', confirmApproveMessage: '承認すると、申請者はメンバーとして登録されます。', confirmReject: '本当に拒否しますか？', confirmRejectMessage: 'この申請を拒否すると、申請者は削除されます。', confirmReuploadTitle: '学生証の再アップロードを依頼', confirmReuploadMessage: '学生証が不鮮明または不適切な場合、再アップロードを依頼できます。', reuploadReasonLabel: '再アップロードを依頼する理由', reuploadReasonUnclear: '画像が不鮮明', reuploadReasonNotValid: '本学の学生証ではない', reuploadReasonMismatch: '学生証情報と入力情報が異なる', cancel: 'キャンセル', confirmButton: '拒否する', confirmApproveButton: '承認する', confirmReuploadButton: '依頼する', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生' },
  en: { title: 'Pending Member Approvals', noApprovals: 'No pending approvals', viewDetails: 'View Details', studentId: 'Student ID Card', applicationDate: 'Application Date', approved: 'Approved', rejected: 'Rejected', reuploadRequested: 'Re-upload Requested', confirmApprove: 'Approve this applicant?', confirmApproveMessage: 'Once approved, the applicant will be registered as a member.', confirmReject: 'Are you sure you want to reject?', confirmRejectMessage: 'Rejecting this application will remove the applicant.', confirmReuploadTitle: 'Request Student ID Re-upload', confirmReuploadMessage: 'If the student ID is unclear or inappropriate, you can request a re-upload.', reuploadReasonLabel: 'Reason for Re-upload Request', reuploadReasonUnclear: 'Image is unclear', reuploadReasonNotValid: 'Not a valid student ID from this university', reuploadReasonMismatch: 'Student ID information does not match the input information', cancel: 'Cancel', confirmButton: 'Reject', confirmApproveButton: 'Approve', confirmReuploadButton: 'Request', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student' }
};

export function AdminApprovals({ language, pendingUsers = [], onApproveUser = () => {}, onRejectUser = () => {}, onRequestReupload }: AdminApprovalsProps) {
  const t = translations[language];
  const [approveUserId, setApproveUserId] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [reuploadUserId, setReuploadUserId] = useState<string | null>(null);
  const [showReuploadConfirm, setShowReuploadConfirm] = useState(false);
  const [reuploadReasons, setReuploadReasons] = useState<Set<string>>(new Set());
  const applications = pendingUsers.length > 0 ? pendingUsers : [];
  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-blue-100 text-blue-800' : category === 'regular-international' ? 'bg-purple-100 text-purple-800' : category === 'exchange' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const handleApprove = (id: string) => { toast.success(t.approved); onApproveUser(id); };
  const handleReject = (id: string) => { toast.error(t.rejected); onRejectUser(id); };

  if (applications.length === 0) return <div className="text-center py-12"><CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">{t.noApprovals}</p></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-gray-900">{t.title}</h2>
      {applications.map((application) => (
        <Card key={application.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-6">
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 md:w-16 md:h-16 bg-linear-to-br from-blue-600 to-purple-600 shrink-0"><AvatarFallback className="text-white text-lg md:text-xl">{application.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 text-base md:text-lg font-semibold">{application.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{application.furigana}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getCategoryColor(application.category)}>{getCategoryLabel(application.category)}</Badge>
                      <Badge variant="outline" className="text-xs"><Calendar className="w-3 h-3 mr-1" />{t.applicationDate}: {application.requestedAt || new Date().toISOString().split('T')[0]}</Badge>
                      {application.studentIdReuploadRequested && <Badge style={{ backgroundColor: '#E0F3FB', color: '#49B1E4' }} className="text-xs"><RefreshCw className="w-3 h-3 mr-1" />{t.reuploadRequested}</Badge>}
                    </div>
                    <Dialog><DialogTrigger asChild><Button className="bg-[#49B1E4] hover:bg-[#3A9BD4] text-white w-full md:w-auto" size="sm"><Eye className="w-4 h-4 mr-2" />{t.viewDetails}</Button></DialogTrigger><EditableApplicantDialog language={language} application={application} onApprove={handleApprove} onReject={handleReject} onRequestReupload={onRequestReupload} /></Dialog>
                  </div>
                </div>
              </div>
              <div className="hidden md:block md:flex-1 shrink-0"><p className="text-gray-600 text-sm mb-2">{t.studentId}</p><div className="border rounded-lg overflow-hidden bg-gray-50 w-full" style={{ aspectRatio: '3/2' }}><img src={application.studentIdImage} alt="Student ID" className="w-full h-full object-contain" /></div></div>
              <div className="w-full md:hidden shrink-0"><p className="text-gray-600 text-sm mb-2">{t.studentId}</p><div className="border rounded-lg overflow-hidden bg-gray-50 w-full" style={{ aspectRatio: '3/2' }}><img src={application.studentIdImage} alt="Student ID" className="w-full h-full object-contain" /></div></div>
            </div>
          </CardContent>
        </Card>
      ))}
      <ConfirmDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm} title={t.confirmApprove} description={t.confirmApproveMessage} onConfirm={() => { if (approveUserId) handleApprove(approveUserId); setShowApproveConfirm(false); }} confirmText={t.confirmApproveButton} cancelText={t.cancel} variant="default" />
      <ConfirmDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm} title={t.confirmReject} description={t.confirmRejectMessage} onConfirm={() => { if (rejectUserId) handleReject(rejectUserId); setShowRejectConfirm(false); }} confirmText={t.confirmButton} cancelText={t.cancel} variant="destructive" />
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
          <DialogFooter><Button variant="outline" onClick={() => { setShowReuploadConfirm(false); setReuploadReasons(new Set()); }}>{t.cancel}</Button><Button onClick={() => { if (reuploadUserId && onRequestReupload) onRequestReupload(reuploadUserId, Array.from(reuploadReasons)); setShowReuploadConfirm(false); setReuploadReasons(new Set()); }} className="bg-[#49B1E4] hover:bg-[#3A9BD4]">{t.confirmReuploadButton}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
