import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, Download, Mail, MessageCircle, MoreVertical, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { queryFeeSettings } from '../../lib/db/queries/fee-settings';
import { upsertFeeSettingsRow } from '../../lib/db/mutations/fee-settings';
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
  isLoading?: boolean;
  onApproveUser?: (userId: string) => void;
  onRejectUser?: (userId: string) => void;
  onRequestReupload?: (userId: string, reasons?: string[]) => void;
  onOpenChat?: (userId: string) => void;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => void;
  onConfirmFeePayment?: (userId: string, isRenewal: boolean) => void | Promise<void>;
  onSetRenewalStatus?: (userId: string, isRenewal: boolean) => void | Promise<void>;
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
    feeFilterGroup: '年会費:',
    categoryFilterGroup: '区分:',
    sortBy: '並び替え',
    sortByFurigana: '五十音（フリガナ）',
    sortByRegisteredAt: '登録日時',
    sortOrderAsc: '昇順',
    sortOrderDesc: '降順',
    exportData: 'データをエクスポート',
    sendBulkEmail: 'メールを一斉送信',
    bulkAction: '編集',
    bulkActionTitle: '一括操作',
    feePriceSetting: '年会費・入会費の価格設定',
    annualFee: '年会費',
    admissionFee: '入会費',
    applyPriceSetting: '価格を適用',
    markPaid: '支払い済み設定',
    markPaidInBulk: '一括で支払い済みにする',
    downloadInfo: '情報ダウンロード',
    downloadCsv: 'CSVダウンロード',
    downloadXlsx: 'XLSXダウンロード',
    bulkDelete: '削除',
    close: '閉じる',
    apply: '適用',
    paidSettingApplied: '支払い済み設定を更新しました',
    priceUpdated: '価格設定を保存しました',
    deletedMembers: '選択メンバーを削除しました',
    confirmBulkDelete: '選択したメンバーを削除します。よろしいですか？',
    csvDownloaded: 'CSVをダウンロードしました',
    xlsxDownloaded: 'XLSXをダウンロードしました',
    chat: '個別チャット',
    selectAll: 'すべて選択',
    noMemberSelected: 'メンバーを選択してください',
    bulkUpdated: '一括更新しました',
    selectMembersToBulkAction: '一括操作を行うにはメンバーを選択してください',
    selectedCount: '選択中',
    feePaidBadge: '会費: 支払済み',
    feeUnpaidBadge: '会費: 未払い',
    renewalBadge: '区分: 継続',
    newMemberBadge: '区分: 新規',
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
    feeFilterGroup: 'Annual fee:',
    categoryFilterGroup: 'Category:',
    sortBy: 'Sort',
    sortByFurigana: 'Kana (A-Z)',
    sortByRegisteredAt: 'Registered At',
    sortOrderAsc: 'Ascending',
    sortOrderDesc: 'Descending',
    exportData: 'Export Data',
    sendBulkEmail: 'Send Bulk Email',
    bulkAction: 'Edit',
    bulkActionTitle: 'Bulk Actions',
    feePriceSetting: 'Fee Price Settings',
    annualFee: 'Annual Fee',
    admissionFee: 'Admission Fee',
    applyPriceSetting: 'Apply Price',
    markPaid: 'Mark as Paid',
    markPaidInBulk: 'Mark selected as paid',
    downloadInfo: 'Download Info',
    downloadCsv: 'Download CSV',
    downloadXlsx: 'Download XLSX',
    bulkDelete: 'Delete',
    close: 'Close',
    apply: 'Apply',
    paidSettingApplied: 'Payment status updated',
    priceUpdated: 'Price settings saved',
    deletedMembers: 'Selected members deleted',
    confirmBulkDelete: 'Delete selected members?',
    csvDownloaded: 'CSV downloaded',
    xlsxDownloaded: 'XLSX downloaded',
    chat: 'Chat',
    selectAll: 'Select All',
    noMemberSelected: 'Please select members',
    bulkUpdated: 'Bulk update completed',
    selectMembersToBulkAction: 'Select members to enable bulk actions',
    selectedCount: 'Selected',
    feePaidBadge: 'Fee: Paid',
    feeUnpaidBadge: 'Fee: Unpaid',
    renewalBadge: 'Type: Renewal',
    newMemberBadge: 'Type: New',
  }
};

export function AdminMembers({ language, approvedMembers, pendingUsers, isLoading = false, onApproveUser, onRejectUser, onRequestReupload, onOpenChat, onSendBulkEmail, onConfirmFeePayment, onSetRenewalStatus, onDeleteUser }: AdminMembersProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [reuploadUserId, setReuploadUserId] = useState<string | null>(null);
  const [reuploadUserName, setReuploadUserName] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({ feePaid: false, feeUnpaid: false, japanese: false, exchange: false, regularInternational: false });
  const [sortBy, setSortBy] = useState<'furigana' | 'createdAt'>('furigana');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [annualFeeAmount, setAnnualFeeAmount] = useState('2000');
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState('2500');
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
  const sortedMembers = useMemo(() => {
    const members = [...filteredMembers];
    members.sort((a, b) => {
      if (sortBy === 'furigana') {
        const aKey = (a.furigana || a.name || '').normalize('NFKC');
        const bKey = (b.furigana || b.name || '').normalize('NFKC');
        return aKey.localeCompare(bKey, 'ja');
      }
      const aTime = new Date(a.createdAt ?? a.requestedAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? b.requestedAt ?? 0).getTime();
      return aTime - bTime;
    });
    if (sortOrder === 'desc') members.reverse();
    return members;
  }, [filteredMembers, sortBy, sortOrder]);
  const selectedCount = selectedMembers.size;
  const allFilteredSelected = sortedMembers.length > 0 && sortedMembers.every((member) => selectedMembers.has(member.id));

  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-[#dbeafe] text-[#193cb8]' : category === 'regular-international' ? 'bg-[rgba(132,212,97,0.3)] text-[#00a63e]' : category === 'exchange' ? 'bg-[#fce7f3] text-[#be185d]' : 'bg-gray-100 text-gray-800';
  const handleToggleFilter = (filterKey: keyof typeof filters) => setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  const handleToggleMember = (memberId: string) => setSelectedMembers(prev => {
    const next = new Set(prev);
    if (next.has(memberId)) next.delete(memberId);
    else next.add(memberId);
    return next;
  });
  const handleToggleAll = () => {
    if (allFilteredSelected) {
      setSelectedMembers(new Set());
      return;
    }
    setSelectedMembers(new Set(sortedMembers.map((member) => member.id)));
  };
  const handleBulkEmail = () => { if (selectedMembers.size === 0) { toast.error(language === 'ja' ? 'メンバーを選択してください' : 'Please select members'); return; } setShowEmailModal(true); };
  const requireSelectedMemberIds = () => {
    const ids = Array.from(selectedMembers);
    if (ids.length === 0) {
      toast.error(t.noMemberSelected);
      return null;
    }
    return ids;
  };
  const handleBulkConfirmFeePayment = async (isRenewal: boolean) => {
    if (!onConfirmFeePayment) return;
    const ids = requireSelectedMemberIds();
    if (!ids) return;
    await Promise.all(ids.map((id) => onConfirmFeePayment(id, isRenewal)));
    toast.success(t.bulkUpdated);
  };
  const handleBulkConfirmFeePaymentKeepType = async () => {
    if (!onConfirmFeePayment) return;
    const selected = sortedMembers.filter((member) => selectedMembers.has(member.id));
    if (selected.length === 0) {
      toast.error(t.noMemberSelected);
      return;
    }
    await Promise.all(selected.map((member) => onConfirmFeePayment(member.id, member.isRenewal ?? false)));
    toast.success(t.bulkUpdated);
  };
  const getSelectedMemberList = () => sortedMembers.filter((member) => selectedMembers.has(member.id));
  const handleBulkDownloadCsv = () => {
    const rows = getSelectedMemberList();
    if (rows.length === 0) return toast.error(t.noMemberSelected);
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header =
      language === 'ja'
        ? ['学籍番号', '氏名', '電話番号', 'メールアドレス', '他の所属団体']
        : ['Student ID', 'Name', 'Phone', 'Email', 'Organizations'];

    const body = rows.map((m) => [
      m.studentNumber ?? '',
      m.name,
      m.phone ?? '',
      m.email,
      m.organizations ?? '',
    ]);
    const csv = [header, ...body].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t.csvDownloaded);
  };
  const handleBulkDownloadXlsx = () => {
    const rows = getSelectedMemberList();
    if (rows.length === 0) return toast.error(t.noMemberSelected);
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((m) => {
        const row: Record<string, string> =
          language === 'ja'
            ? {
                '学籍番号': m.studentNumber ?? '',
                '氏名': m.name,
                '電話番号': m.phone ?? '',
                'メールアドレス': m.email,
                '他の所属団体': m.organizations ?? '',
              }
            : {
                'Student ID': m.studentNumber ?? '',
                'Name': m.name,
                'Phone': m.phone ?? '',
                'Email': m.email,
                'Organizations': m.organizations ?? '',
              };
        return row;
      })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');
    XLSX.writeFile(workbook, `members_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t.xlsxDownloaded);
  };
  const handleBulkDelete = async () => {
    if (!onDeleteUser) return;
    const ids = requireSelectedMemberIds();
    if (!ids) return;
    if (!window.confirm(t.confirmBulkDelete)) return;
    await Promise.all(ids.map((id) => Promise.resolve(onDeleteUser(id))));
    setSelectedMembers(new Set());
    setShowBulkActionsModal(false);
    toast.success(t.deletedMembers);
  };

  const openBulkActionsModal = async () => {
    try {
      const settings = await queryFeeSettings();
      setAnnualFeeAmount(String(settings.annualFee));
      setAdmissionFeeAmount(String(settings.admissionFee));
    } catch {
      // 取得失敗時は画面上の値をそのまま使う（デフォルトあり）
    } finally {
      setShowBulkActionsModal(true);
    }
  };

  const handleSaveFeeSettings = async () => {
    const annualFee = Number(annualFeeAmount);
    const admissionFee = Number(admissionFeeAmount);
    if (!Number.isFinite(annualFee) || annualFee < 0) return toast.error(language === 'ja' ? '年会費の値が不正です' : 'Invalid annual fee');
    if (!Number.isFinite(admissionFee) || admissionFee < 0) return toast.error(language === 'ja' ? '入会費の値が不正です' : 'Invalid admission fee');
    const { error } = await upsertFeeSettingsRow({ annualFee, admissionFee, currency: 'JPY' });
    if (error) return toast.error(error.message);
    toast.success(t.priceUpdated);
  };
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
            <div className="rounded-xl border border-[rgba(61,61,78,0.12)] bg-white p-3 space-y-3">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-[#3D3D4E] block">{t.feeFilterGroup}</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2"><Checkbox id="filter-fee-paid" checked={filters.feePaid} onCheckedChange={() => handleToggleFilter('feePaid')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-fee-paid" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.feePaid}</label></div>
                  <div className="flex items-center gap-2"><Checkbox id="filter-fee-unpaid" checked={filters.feeUnpaid} onCheckedChange={() => handleToggleFilter('feeUnpaid')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-fee-unpaid" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.feeUnpaid}</label></div>
                </div>
              </div>
              <div className="border-t border-[rgba(61,61,78,0.12)]" />
              <div className="space-y-2">
                <span className="text-sm font-semibold text-[#3D3D4E] block">{t.categoryFilterGroup}</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2"><Checkbox id="filter-japanese" checked={filters.japanese} onCheckedChange={() => handleToggleFilter('japanese')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-japanese" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.japanese}</label></div>
                  <div className="flex items-center gap-2"><Checkbox id="filter-regular-international" checked={filters.regularInternational} onCheckedChange={() => handleToggleFilter('regularInternational')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-regular-international" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.regularInternational}</label></div>
                  <div className="flex items-center gap-2"><Checkbox id="filter-exchange" checked={filters.exchange} onCheckedChange={() => handleToggleFilter('exchange')} className="size-4 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:text-white" /><label htmlFor="filter-exchange" className="text-sm text-[#3D3D4E] cursor-pointer select-none">{t.exchange}</label></div>
                </div>
              </div>
            </div>
            <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#99A1AF]" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.search} className="pl-10 bg-[#EEEBE3] border-0 text-[#6B6B7A]" /></div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[#3D3D4E]">{t.sortBy}</span>
              <Select value={sortBy} onValueChange={(value: 'furigana' | 'createdAt') => setSortBy(value)}>
                <SelectTrigger className="w-[210px] bg-[#EEEBE3] border-0 text-[#3D3D4E]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="furigana">{t.sortByFurigana}</SelectItem>
                  <SelectItem value="createdAt">{t.sortByRegisteredAt}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-[130px] bg-[#EEEBE3] border-0 text-[#3D3D4E]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{t.sortOrderAsc}</SelectItem>
                  <SelectItem value="desc">{t.sortOrderDesc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {activeTab === 'approved' && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button onClick={handleToggleAll} className={`w-[18px] h-[17px] rounded border flex items-center justify-center ${allFilteredSelected ? 'bg-[#49B1E4] border-[#49B1E4]' : 'bg-white border-[#49B1E4]'}`}>
                  {allFilteredSelected && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14">
                      <path
                        d={(svgPaths2 as Record<string, string>)["p3de7e600"]}
                        stroke="#F5F1E8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.16667"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-[#6B6B7A]">
                  {t.selectedCount}: {selectedCount}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button onClick={() => void openBulkActionsModal()} disabled={selectedCount === 0} size="sm" className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white gap-1.5"><Plus className="w-4 h-4" /><Pencil className="w-4 h-4" />{t.bulkAction}</Button>
              </div>
            </div>

            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`member-skeleton-${index}`} className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4">
                    <div className="hidden md:flex items-center gap-4">
                      <Skeleton className="h-5 w-5 rounded-sm" />
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-6 w-28 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-4 w-4 rounded-sm mt-1" />
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-40" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="ml-9 flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-24 rounded-full" />
                          <Skeleton className="h-5 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && sortedMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4">
                <div className="hidden md:flex items-center gap-4">
                  <button onClick={() => handleToggleMember(member.id)} className="shrink-0"><div className={`w-5 h-5 rounded border-2 border-[#49B1E4] flex items-center justify-center ${selectedMembers.has(member.id) ? 'bg-[#49B1E4]' : 'bg-white'}`}>{selectedMembers.has(member.id) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 20 20"><path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div></button>
                  <Avatar className="w-12 h-12 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, rgb(21, 93, 252) 0%, rgb(152, 16, 250) 100%)' }}><AvatarFallback className="bg-transparent text-white font-normal">{getInitials(member.name)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><h3 className="text-[#101828] text-base font-normal truncate">{member.name}</h3><p className="text-[#4A5565] text-sm truncate">{member.email}</p><p className="text-[#6A7282] text-xs">ID: {member.id}</p></div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge className={`${getCategoryColor(member.category)} border-0 font-medium text-xs px-2 py-1 h-8 flex items-center shrink-0`}>{getCategoryLabel(member.category)}</Badge>
                    <Badge className={`${member.feePaid ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'} border-0 font-medium text-xs px-2 py-1`}>{member.feePaid ? t.feePaidBadge : t.feeUnpaidBadge}</Badge>
                    <Badge className="bg-[#eef2ff] text-[#3730a3] border-0 font-medium text-xs px-2 py-1">{member.isRenewal ? t.renewalBadge : t.newMemberBadge}</Badge>
                  </div>
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
                    <div className="flex flex-col gap-1">
                      <Badge className={`${getCategoryColor(member.category)} border-0 font-medium text-xs px-2 py-1`}>{getCategoryLabel(member.category)}</Badge>
                      <Badge className={`${member.feePaid ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'} border-0 font-medium text-xs px-2 py-1`}>{member.feePaid ? t.feePaidBadge : t.feeUnpaidBadge}</Badge>
                    </div>
                    <Button onClick={() => onOpenChat && onOpenChat(member.id)} variant="outline" size="sm" className="bg-[#F5F1E8] border-[rgba(61,61,78,0.15)] text-[#3D3D4E] hover:bg-[#E8E4DB] gap-1.5 h-8 text-xs"><MessageCircle className="w-3.5 h-3.5" />{t.chat}</Button>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && filteredMembers.length === 0 && <div className="text-center py-12 text-[#6B6B7A]">{language === 'ja' ? 'メンバーが見つかりません' : 'No members found'}</div>}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`pending-skeleton-${index}`} className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24 rounded-md" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AdminApprovals language={language} pendingUsers={pendingUsers} onApproveUser={onApproveUser!} onRejectUser={onRejectUser!} onRequestReupload={onRequestReupload} />
            )}
          </>
        )}
      </div>

      {showBulkActionsModal && (
        <Dialog open={showBulkActionsModal} onOpenChange={setShowBulkActionsModal}>
          <DialogContent className="max-w-xl bg-[#F5F1E8]">
            <DialogHeader>
              <DialogTitle className="text-[#3D3D4E]">{t.bulkActionTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="text-sm text-[#6B6B7A]">{t.selectedCount}: {selectedCount}</div>

              <div className="space-y-2 border rounded-lg border-[rgba(61,61,78,0.15)] p-3">
                <p className="text-sm font-semibold text-[#3D3D4E]">{t.sendBulkEmail}</p>
                <Button onClick={() => { setShowBulkActionsModal(false); handleBulkEmail(); }} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">
                  <Mail className="w-4 h-4 mr-1" />
                  {t.sendBulkEmail}
                </Button>
              </div>

              <div className="space-y-3 border rounded-lg border-[rgba(61,61,78,0.15)] p-3">
                <p className="text-sm font-semibold text-[#3D3D4E]">{t.feePriceSetting}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-[#3D3D4E]">{t.annualFee}</label>
                    <Input value={annualFeeAmount} onChange={(e) => setAnnualFeeAmount(e.target.value)} className="bg-[#EEEBE3] border-0" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#3D3D4E]">{t.admissionFee}</label>
                    <Input value={admissionFeeAmount} onChange={(e) => setAdmissionFeeAmount(e.target.value)} className="bg-[#EEEBE3] border-0" />
                  </div>
                </div>
                <Button onClick={() => void handleSaveFeeSettings()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">
                  {t.applyPriceSetting}
                </Button>
              </div>

              <div className="space-y-3 border rounded-lg border-[rgba(61,61,78,0.15)] p-3">
                <p className="text-sm font-semibold text-[#3D3D4E]">{t.markPaid}</p>
                <Button onClick={() => void handleBulkConfirmFeePaymentKeepType()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">
                  {t.markPaidInBulk}
                </Button>
              </div>

              <div className="space-y-2 border rounded-lg border-[rgba(61,61,78,0.15)] p-3">
                <p className="text-sm font-semibold text-[#3D3D4E]">{t.downloadInfo}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleBulkDownloadCsv} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white gap-1"><Download className="w-4 h-4" />{t.downloadCsv}</Button>
                  <Button onClick={handleBulkDownloadXlsx} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white gap-1"><Download className="w-4 h-4" />{t.downloadXlsx}</Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button onClick={() => void handleBulkDelete()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">{t.bulkDelete}</Button>
                <Button onClick={() => setShowBulkActionsModal(false)} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">{t.close}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
