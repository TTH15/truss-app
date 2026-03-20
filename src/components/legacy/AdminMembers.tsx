import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { Search, Download, Mail, MessageCircle, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { BulkEmailModal } from './BulkEmailModal';
import { ReuploadRequestModal } from './ReuploadRequestModal';
import { MemberDetailModal } from './MemberDetailModal';
import { AdminApprovals } from './AdminApprovals';
import svgPaths from '../../imports/svg-u7k8r9dq17';
import svgPaths2 from '../../imports/svg-40vpfbujgn';
import type { Language, User } from '../../domain/types/app';

interface AdminMembersProps {
  language: Language;
  approvedMembers: User[];
  pendingUsers: User[];
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  onRequestReupload?: (userId: string, reasons?: string[]) => void;
  onOpenChat?: (userId: string) => void;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => void;
  onConfirmFeePayment?: (userId: string, isRenewal: boolean) => void;
  onSetRenewalStatus?: (userId: string, isRenewal: boolean) => void;
  onDeleteUser?: (userId: string) => void;
}

const translations = {
  ja: {
    title: 'メンバー管理',
    membersTab: 'メンバー',
    pendingTab: '承認待ち',
    search: 'メンバーを検索...',
    japanese: '日本人学生・国内学生',
    regularInternational: '正規留学生',
    exchange: '交換留学生',
    feePaid: '年会費支払い済み',
    feeUnpaid: '年会費未払い',
    exportData: 'データをエクスポート',
    sendBulkEmail: 'メールを一斉送信',
    chat: '個別チャット',
    selectAll: 'すべて選択',
  },
  en: {
    title: 'Member Management',
    membersTab: 'Members',
    pendingTab: 'Pending',
    search: 'Search members...',
    japanese: 'Japanese Student',
    regularInternational: 'Regular International',
    exchange: 'Exchange Student',
    feePaid: 'Fee Paid',
    feeUnpaid: 'Fee Unpaid',
    exportData: 'Export Data',
    sendBulkEmail: 'Send Bulk Email',
    chat: 'Chat',
    selectAll: 'Select All',
  }
};

export function AdminMembers({ language, approvedMembers, pendingUsers, onApproveUser, onRejectUser, onRequestReupload, onOpenChat, onSendBulkEmail, onConfirmFeePayment, onSetRenewalStatus, onDeleteUser }: AdminMembersProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [reuploadUserId, setReuploadUserId] = useState<string | null>(null);
  const [reuploadUserName, setReuploadUserName] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({ feePaid: false, feeUnpaid: false, japanese: false, exchange: false, regularInternational: false });
  const displayedMembers = activeTab === 'approved' ? approvedMembers : pendingUsers;

  const filteredMembers = displayedMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    const categoryFilters = [filters.japanese, filters.regularInternational, filters.exchange];
    const anyCategorySelected = categoryFilters.some(f => f);
    if (anyCategorySelected) {
      const matchesCategory = (filters.japanese && member.category === 'japanese') || (filters.regularInternational && member.category === 'regular-international') || (filters.exchange && member.category === 'exchange');
      if (!matchesCategory) return false;
    }
    const paymentFilters = [filters.feePaid, filters.feeUnpaid];
    const anyPaymentSelected = paymentFilters.some(f => f);
    if (anyPaymentSelected) {
      const matchesPayment = (filters.feePaid && member.feePaid) || (filters.feeUnpaid && !member.feePaid);
      if (!matchesPayment) return false;
    }
    return true;
  });

  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-[#dbeafe] text-[#193cb8]' : category === 'regular-international' ? 'bg-[rgba(132,212,97,0.3)] text-[#00a63e]' : category === 'exchange' ? 'bg-[#fce7f3] text-[#be185d]' : 'bg-gray-100 text-gray-800';
  const handleToggleFilter = (filterKey: keyof typeof filters) => setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  const handleToggleMember = (memberId: string) => setSelectedMembers(prev => { const next = new Set(prev); next.has(memberId) ? next.delete(memberId) : next.add(memberId); return next; });
  const handleToggleAll = () => { if (selectAll) setSelectedMembers(new Set()); else setSelectedMembers(new Set(filteredMembers.map(m => m.id))); setSelectAll(!selectAll); };
  const handleExport = () => toast.success(language === 'ja' ? 'データをエクスポートしました' : 'Data exported successfully');
  const handleBulkEmail = () => { if (selectedMembers.size === 0) { toast.error(language === 'ja' ? 'メンバーを選択してください' : 'Please select members'); return; } setShowEmailModal(true); };
  const handleReuploadRequestOpen = (userId: string, userName: string) => { setReuploadUserId(userId); setReuploadUserName(userName); setShowReuploadModal(true); };

  const handleReuploadRequestSend = (reasons: string[]) => {
    const reasonTexts = { ja: { reason1: '規定学生証の画像ではない。', reason2: '画質が荒く、情報が読み取れない。' }, en: { reason1: 'Not a valid student ID image.', reason2: 'Image quality is too low to read information.' } };
    const messages = reasons.map(r => reasonTexts[language][r as 'reason1' | 'reason2']);
    const message = messages.join('\n');
    const notificationMessage = language === 'ja' ? `学生証の再アップロードをお願いします。理由: ${messages.join(', ')}` : `Please re-upload your student ID. Reason: ${messages.join(', ')}`;
    console.log(`通知送信: ${reuploadUserName} (${reuploadUserId})宛 - ${notificationMessage}`);
    toast.success(language === 'ja' ? `${reuploadUserName} さんに再依頼を送信しました` : `Re-upload request sent to ${reuploadUserName}`);
    console.log(`Reupload request to ${reuploadUserName} (${reuploadUserId}):`, message);
  };

  const getInitials = (name: string) => { const parts = name.split(' '); if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase(); return name.substring(0, 2).toUpperCase(); };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="relative">
          <div className="flex items-start gap-2">
            <button onClick={() => setActiveTab('approved')} className="h-[50px] relative">
              <div className={`flex items-center gap-2 px-4 h-full border-b-2 ${activeTab === 'approved' ? 'border-[#3D3D4E]' : 'border-transparent'}`}>
                <div className="relative shrink-0 size-[20px]">
                  <svg className="block size-full" fill="none" viewBox="0 0 20 20">
                    <path d={svgPaths.p25397b80} stroke={activeTab === 'approved' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p2c4f400} stroke={activeTab === 'approved' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.p2241fff0} stroke={activeTab === 'approved' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    <path d={svgPaths.pc9c280} stroke={activeTab === 'approved' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </div>
                <span className={`font-normal leading-[24px] text-[16px] tracking-[-0.3125px] ${activeTab === 'approved' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`}>{t.membersTab}（{approvedMembers.length}）</span>
              </div>
            </button>
            <button onClick={() => setActiveTab('pending')} className="h-[50px] relative">
              <div className={`flex items-center gap-2 px-4 h-full border-b-2 ${activeTab === 'pending' ? 'border-[#3D3D4E]' : 'border-transparent'}`}>
                <div className="relative shrink-0 size-[20px]">
                  <svg className="block size-full" fill="none" viewBox="0 0 20 20">
                    <g clipPath="url(#clip-pending)">
                      <path d={svgPaths.p29da0700} stroke={activeTab === 'pending' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      <path d={svgPaths.p3fe63d80} stroke={activeTab === 'pending' ? '#3D3D4E' : '#6B6B7A'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                    </g>
                    <defs><clipPath id="clip-pending"><rect fill="white" height="20" width="20" /></clipPath></defs>
                  </svg>
                </div>
                <span className={`font-normal leading-[24px] text-[16px] tracking-[-0.3125px] ${activeTab === 'pending' ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`}>{t.pendingTab}</span>
                {pendingUsers.length > 0 && <div className="min-w-[20px] h-[20px] bg-[#D4183D] rounded-full flex items-center justify-center px-1.5"><span className="text-white text-xs font-semibold leading-none">{pendingUsers.length}</span></div>}
              </div>
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-b border-[#E5E7EB]" />
        </div>

        {activeTab === 'approved' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2"><Checkbox id="filter-fee-paid" checked={filters.feePaid} onCheckedChange={() => handleToggleFilter('feePaid')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-fee-paid" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.feePaid}</label></div>
              <div className="flex items-center gap-2"><Checkbox id="filter-fee-unpaid" checked={filters.feeUnpaid} onCheckedChange={() => handleToggleFilter('feeUnpaid')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-fee-unpaid" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.feeUnpaid}</label></div>
              <div className="flex items-center gap-2"><Checkbox id="filter-japanese" checked={filters.japanese} onCheckedChange={() => handleToggleFilter('japanese')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-japanese" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.japanese}</label></div>
              <div className="flex items-center gap-2"><Checkbox id="filter-exchange" checked={filters.exchange} onCheckedChange={() => handleToggleFilter('exchange')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-exchange" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.exchange}</label></div>
              <div className="flex items-center gap-2"><Checkbox id="filter-regular-international" checked={filters.regularInternational} onCheckedChange={() => handleToggleFilter('regularInternational')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-regular-international" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.regularInternational}</label></div>
            </div>
            <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#99A1AF]" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.search} className="pl-10 bg-[#EEEBE3] border-0 text-[#6B6B7A]" /></div>
          </div>
        )}
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {activeTab === 'approved' && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button onClick={handleToggleAll} className={`w-[18px] h-[17px] rounded border flex items-center justify-center ${selectAll ? 'bg-[#3D3D4E] border-[#3D3D4E]' : 'bg-[#EEEBE3] border-[rgba(61,61,78,0.15)]'}`}>
                  {selectAll && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d={(svgPaths2 as any).p3de7e600} stroke="#F5F1E8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" /></svg>}
                </button>
                <label onClick={handleToggleAll} className="text-[#3D3D4E] text-sm cursor-pointer select-none">{t.selectAll}</label>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleBulkEmail} size="icon" className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9 w-9" title={t.sendBulkEmail}><Mail className="w-4 h-4" /></Button>
                <Button onClick={handleExport} size="icon" variant="outline" className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] h-9 w-9" title={t.exportData}><Download className="w-4 h-4" /></Button>
              </div>
            </div>

            {filteredMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4">
                <div className="hidden md:flex items-center gap-4">
                  <button onClick={() => handleToggleMember(member.id)} className="shrink-0"><div className={`w-5 h-5 rounded border-2 border-[#49B1E4] flex items-center justify-center ${selectedMembers.has(member.id) ? 'bg-[#49B1E4]' : 'bg-white'}`}>{selectedMembers.has(member.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 20 20"><path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div></button>
                  <Avatar className="w-12 h-12 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, rgb(21, 93, 252) 0%, rgb(152, 16, 250) 100%)' }}><AvatarFallback className="bg-transparent text-white font-normal">{getInitials(member.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><h3 className="text-[#101828] text-base font-normal truncate">{member.name}</h3><p className="text-[#4A5565] text-sm truncate">{member.email}</p><p className="text-[#6A7282] text-xs">ID: {member.id}</p></div>
                  <Badge className={`${getCategoryColor(member.category)} border-0 font-medium text-xs px-2 py-1 h-8 flex items-center shrink-0`}>{getCategoryLabel(member.category)}</Badge>
                  <Button onClick={() => onOpenChat && onOpenChat(member.id)} variant="outline" size="sm" className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] gap-2 shrink-0 h-8"><MessageCircle className="w-4 h-4" />{t.chat}</Button>
                  <button onClick={() => { setSelectedUser(member); setShowDetailModal(true); }} className="text-[#3D3D4E] shrink-0 hover:bg-[#F5F1E8] rounded p-1 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                </div>

                <div className="md:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <button onClick={() => handleToggleMember(member.id)} className="shrink-0 mt-1"><div className={`w-4 h-4 rounded border border-[#49B1E4] flex items-center justify-center ${selectedMembers.has(member.id) ? 'bg-[#49B1E4]' : 'bg-white'}`}>{selectedMembers.has(member.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 20 20"><path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div></button>
                    <Avatar className="w-10 h-10 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, rgb(21, 93, 252) 0%, rgb(152, 16, 250) 100%)' }}><AvatarFallback className="bg-transparent text-white font-normal text-sm">{getInitials(member.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2"><h3 className="text-[#101828] text-sm font-normal">{member.name}</h3><button onClick={() => { setSelectedUser(member); setShowDetailModal(true); }} className="text-[#3D3D4E] shrink-0 hover:bg-[#F5F1E8] rounded p-0.5 transition-colors"><MoreVertical className="w-4 h-4" /></button></div>
                      <p className="text-[#4A5565] text-xs truncate">{member.email}</p><p className="text-[#6A7282] text-xs">ID: {member.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 ml-9">
                    <Badge className={`${getCategoryColor(member.category)} border-0 font-medium text-xs px-2 py-1`}>{getCategoryLabel(member.category)}</Badge>
                    <Button onClick={() => onOpenChat && onOpenChat(member.id)} variant="outline" size="sm" className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] gap-1.5 h-8 text-xs"><MessageCircle className="w-3.5 h-3.5" />{t.chat}</Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && <div className="text-center py-12 text-[#6B6B7A]">{language === 'ja' ? 'メンバーが見つかりません' : 'No members found'}</div>}
          </>
        )}

        {activeTab === 'pending' && (
          <AdminApprovals language={language} pendingUsers={pendingUsers} onApproveUser={onApproveUser!} onRejectUser={onRejectUser!} onRequestReupload={onRequestReupload} />
        )}
      </div>

      {showEmailModal && (
        <BulkEmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          language={language}
          recipientCount={selectedMembers.size}
          onSend={(subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail) => {
            if (onSendBulkEmail) onSendBulkEmail(Array.from(selectedMembers), subjectJa, subjectEn, messageJa, messageEn, sendInApp, sendEmail);
            setShowEmailModal(false);
            setSelectedMembers(new Set());
          }}
        />
      )}

      {showReuploadModal && reuploadUserName && (
        <ReuploadRequestModal isOpen={showReuploadModal} onClose={() => setShowReuploadModal(false)} language={language} userName={reuploadUserName} onSend={handleReuploadRequestSend} />
      )}

      {showDetailModal && selectedUser && (
        <MemberDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          language={language}
          user={selectedUser}
          onDelete={() => {
            if (onDeleteUser) onDeleteUser(selectedUser.id);
            toast.success(language === 'ja' ? 'メンバーを削除しました' : 'Member deleted successfully');
            setShowDetailModal(false);
          }}
          onConfirmFeePayment={(isRenewal: boolean) => {
            if (onConfirmFeePayment) onConfirmFeePayment(selectedUser.id, isRenewal);
            const feeAmount = isRenewal ? '¥2,000' : '¥2,500';
            toast.success(language === 'ja' ? `年会費（${feeAmount}）の支払いを確認しました` : `Fee payment (${feeAmount}) confirmed`);
            setShowDetailModal(false);
          }}
          onSetRenewalStatus={(isRenewal: boolean) => {
            if (onSetRenewalStatus) onSetRenewalStatus(selectedUser.id, isRenewal);
            toast.success(language === 'ja' ? (isRenewal ? '継続会員に設定しました' : '新規会員に設定しました') : (isRenewal ? 'Set as renewal member' : 'Set as new member'));
          }}
        />
      )}
    </div>
  );
}
