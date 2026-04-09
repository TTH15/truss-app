import { X, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { Language, User } from '../../domain/types/app';
import { useState } from 'react';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  language: Language;
  isPending?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onConfirmFeePayment?: (isRenewal: boolean) => void;
}

const translations = {
  ja: { applicationDate: '申請日', nickname: 'ニックネーム', id: 'ID', email: 'メールアドレス', phone: '電話番号', studentNumber: '学生番号', major: '学部学科', category: '区分', grade: '学年', birthCountry: '生まれた国', languages: '話せる言語', approve: '承認する', reject: '拒否する', delete: '削除', confirmDelete: '本当にこのメンバーを削除しますか？', confirmDeleteMessage: 'この操作は取り消せません。', cancel: 'キャンセル', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生', feeStatus: '会費状況', feePaid: '支払い済み', feeUnpaid: '未払い', confirmFeePayment: '支払い確認', renewal: '継続会員', newMember: '新規会員', renewalFee: '¥2,000（年会費のみ）', newMemberFee: '¥2,500（入会金+年会費）', membershipYear: '会員年度', confirmAsRenewal: '継続として確認（¥2,000）', confirmAsNew: '新規として確認（¥2,500）', setAsRenewal: '継続会員に設定', setAsNew: '新規会員に設定', memberTypeHint: '※3/31までに登録完了した会員は「継続」扱い' },
  en: { applicationDate: 'Application Date', nickname: 'Nickname', id: 'ID', email: 'Email', phone: 'Phone Number', studentNumber: 'Student Number', major: 'Major', category: 'Category', grade: 'Grade', birthCountry: 'Birth Country', languages: 'Languages', approve: 'Approve', reject: 'Reject', delete: 'Delete', confirmDelete: 'Are you sure you want to delete this member?', confirmDeleteMessage: 'This action cannot be undone.', cancel: 'Cancel', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student', feeStatus: 'Fee Status', feePaid: 'Paid', feeUnpaid: 'Unpaid', confirmFeePayment: 'Confirm Payment', renewal: 'Renewal', newMember: 'New Member', renewalFee: '¥2,000 (Annual fee only)', newMemberFee: '¥2,500 (Entry + Annual)', membershipYear: 'Membership Year', confirmAsRenewal: 'Confirm as Renewal (¥2,000)', confirmAsNew: 'Confirm as New (¥2,500)', setAsRenewal: 'Set as Renewal', setAsNew: 'Set as New Member', memberTypeHint: '* Members registered by 3/31 are treated as "Renewal"' }
};

export function MemberDetailModal({ isOpen, onClose, user, language, isPending = false, onApprove, onReject, onDelete, onConfirmFeePayment }: MemberDetailModalProps) {
  const t = translations[language];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  if (!isOpen) return null;
  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-[#dbeafe] text-[#193cb8]' : category === 'regular-international' ? 'bg-[rgba(132,212,97,0.3)] text-[#00a63e]' : category === 'exchange' ? 'bg-[#fce7f3] text-[#be185d]' : 'bg-gray-100 text-gray-800';

  const isFeePaid = !!user.feePaid;
  const isRenewal = !!user.isRenewal;
  const feeAmountLabel = isRenewal ? t.renewalFee : t.newMemberFee;
  const feeBadgeClass = isFeePaid
    ? 'bg-[#dcfce7] text-[#166534]'
    : 'bg-[#fee2e2] text-[#991b1b]';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[510px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
          <div className="flex items-start justify-between">
            <div className="space-y-2"><h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{user.name}</h2><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.furigana}</p><p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">{t.applicationDate}: 2026-01-13</p></div>
            <button onClick={onClose} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70 p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.nickname}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.nickname || '-'}</p></div>
            <div><p className="text-[#6B6B7A] text-sm tracking-[-0.1504px] mb-1">{t.id}:</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.id}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.email}</p><p className="text-[#101828] text-base tracking-[-0.3125px] break-all">{user.email}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.phone}</p><p className="text-[#101828] text-base tracking-[-0.3125px] break-all">{user.phone || '-'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.studentNumber}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.studentNumber || '1234567A'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.major}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.major || (language === 'ja' ? '理学部 物理学科' : 'Physics Dept.')}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.category}</p><Badge className={`${getCategoryColor(user.category)} border-0 font-medium text-xs px-2 py-0.5 mt-1`}>{getCategoryLabel(user.category)}</Badge></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.grade}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.grade || '3'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.birthCountry}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.birthCountry || '-'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.languages}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.languages || '-'}</p></div>
          </div>

          {!isPending && (
            <div className="mt-8 pt-6 border-t border-[rgba(61,61,78,0.15)] space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold text-[#3D3D4E] tracking-[-0.1504px]">
                  {t.feeStatus}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${feeBadgeClass} border-0 font-medium text-xs px-2 py-1`}>
                    {isFeePaid ? t.feePaid : t.feeUnpaid}
                  </Badge>
                  {typeof user.membershipYear === 'number' && (
                    <Badge className="bg-white/60 border-0 font-medium text-xs px-2 py-1 text-[#3D3D4E]">
                      {t.membershipYear}: {user.membershipYear}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#3D3D4E]">
                {feeAmountLabel}
              </p>

              {onConfirmFeePayment && (
                <div className="pt-1">
                  <Button
                    onClick={() => onConfirmFeePayment(Boolean(user.isRenewal))}
                    className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9"
                  >
                    {t.confirmFeePayment}
                  </Button>
                </div>
              )}
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 mt-8">
              <Button onClick={onApprove} className="flex-1 bg-[#00A63E] hover:bg-[#008C35] text-[#F5F1E8] h-9 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /><span className="font-medium text-sm tracking-[-0.1504px]">{t.approve}</span></Button>
              <Button onClick={onReject} className="flex-1 bg-[#D4183D] hover:bg-[#B01432] text-white h-9 flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /><span className="font-medium text-sm tracking-[-0.1504px]">{t.reject}</span></Button>
            </div>
          )}

          {!isPending && onDelete && (
            <div className="mt-8 pt-6 border-t border-[rgba(61,61,78,0.15)]">
              <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="w-full border-[#D4183D] text-[#D4183D] hover:bg-[#D4183D] hover:text-white h-10"><Trash2 className="w-4 h-4 mr-2" />{t.delete}</Button>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[rgba(61,61,78,0.15)]"><div className="flex items-start justify-between"><div className="space-y-2"><h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{t.confirmDelete}</h2><p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">{t.confirmDeleteMessage}</p></div><button onClick={() => setShowDeleteConfirm(false)} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"><X className="w-4 h-4" /></button></div></div>
              <div className="p-6"><div className="flex gap-2 mt-8"><Button onClick={() => { onDelete?.(); setShowDeleteConfirm(false); onClose(); }} className="w-full bg-[#D4183D] hover:bg-[#B01432] text-white h-9 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /><span className="font-medium text-sm tracking-[-0.1504px]">{t.delete}</span></Button></div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
