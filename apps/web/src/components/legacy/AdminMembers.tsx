import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { UserAvatarImage } from './UserAvatarImage';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, Download, MessageCircle, Users2, UserMinus, UserCheck, ListChecks, Send, CircleCheck, Trash2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { queryFeeSettings, toLocalDateKey } from '@truss/core';
import { upsertFeeSettingsRow } from '@truss/core';
import { BulkEmailModal } from './BulkEmailModal';
import { ReuploadRequestModal } from './ReuploadRequestModal';
import { MemberDetailModal } from './MemberDetailModal';
import { RoleBadge } from './RoleBadge';
import { FeeUnpaidWalletIcon } from './FeeUnpaidWalletIcon';
import { useAuth } from '../../contexts/AuthContext';
import { AdminApprovals } from './AdminApprovals';
import type { Language, User, UserRole, DbError } from '@truss/core';
import { isSystemUser, isPrivilegedRole, ROLE_LIST_PRIORITY, isGradeSuspicious } from '@truss/core';

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
  onSetUserRole?: (userId: string, role: UserRole) => Promise<{ error: DbError | null }>;
  onDeleteUser?: (userId: string) => void;
}

const translations = {
  ja: {
    title: 'メンバー管理',
    membersTab: '部員', nonMembersTab: '非会員',
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
    sendBulkEmail: 'メッセージを一斉送信',
    bulkAction: '一括操作',
    bulkActionTitle: '一括操作',
    feePriceSetting: '会費の設定',
    annualFee: '年会費',
    admissionFee: '入会費',
    applyPriceSetting: '価格を適用',
    markPaid: '支払い済み設定',
    markPaidInBulk: '一括で支払い済みにする',
    downloadInfo: '情報ダウンロード',
    downloadCsv: 'CSVダウンロード',
    downloadXlsx: 'XLSXダウンロード',
    downloadTemplate: '部員名簿（提出用）',
    bulkDelete: '削除',
    close: '閉じる',
    apply: '適用',
    paidSettingApplied: '支払い済み設定を更新しました',
    priceUpdated: '価格設定を保存しました',
    deletedMembers: '選択メンバーを削除しました',
    confirmBulkDelete: '選択したメンバーを削除します。よろしいですか？', confirmBulkMarkPaid: '選択したメンバーを支払い済みにします。よろしいですか？',
    csvDownloaded: 'CSVをダウンロードしました',
    xlsxDownloaded: 'XLSXをダウンロードしました',
    templateDownloaded: '部員名簿をダウンロードしました',
    templateDownloadFailed: 'テンプレートのダウンロードに失敗しました',
    chat: '個別チャット',
    studentNumberLabel: '学籍番号',
    selectAll: 'すべて選択',
    noMemberSelected: 'メンバーを選択してください',
    bulkUpdated: '一括更新しました',
    selectMembersToBulkAction: '一括操作を行うにはメンバーを選択してください',
    selectedCount: '選択中',
    feeUnpaidTooltip: '会費が未払いです',
  },
  en: {
    title: 'Member Management',
    membersTab: 'Members', nonMembersTab: 'Non-members',
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
    sendBulkEmail: 'Send bulk message',
    bulkAction: 'Edit',
    bulkActionTitle: 'Bulk Actions',
    feePriceSetting: 'Fee settings',
    annualFee: 'Annual Fee',
    admissionFee: 'Admission Fee',
    applyPriceSetting: 'Apply Price',
    markPaid: 'Mark as Paid',
    markPaidInBulk: 'Mark selected as paid',
    downloadInfo: 'Download Info',
    downloadCsv: 'Download CSV',
    downloadXlsx: 'Download XLSX',
    downloadTemplate: 'Member Roster (Submission Form)',
    bulkDelete: 'Delete',
    close: 'Close',
    apply: 'Apply',
    paidSettingApplied: 'Payment status updated',
    priceUpdated: 'Price settings saved',
    deletedMembers: 'Selected members deleted',
    confirmBulkDelete: 'Delete selected members?', confirmBulkMarkPaid: 'Mark selected members as paid?',
    csvDownloaded: 'CSV downloaded',
    xlsxDownloaded: 'XLSX downloaded',
    templateDownloaded: 'Member roster downloaded',
    templateDownloadFailed: 'Failed to download template',
    chat: 'Chat',
    studentNumberLabel: 'Student ID',
    selectAll: 'Select All',
    noMemberSelected: 'Please select members',
    bulkUpdated: 'Bulk update completed',
    selectMembersToBulkAction: 'Select members to enable bulk actions',
    selectedCount: 'Selected',
    feeUnpaidTooltip: 'Membership fee unpaid',
  }
};


export function AdminMembers({ language, approvedMembers, pendingUsers, isLoading = false, onApproveUser, onRejectUser, onRequestReupload, onOpenChat, onSendBulkEmail, onConfirmFeePayment, onSetRenewalStatus, onSetUserRole, onDeleteUser }: AdminMembersProps) {
  const { user: currentAdmin } = useAuth();
  const t = translations[language];
  const toKatakana = (value: string) =>
    value.replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60));
  const [activeTab, setActiveTab] = useState<'members' | 'nonMembers' | 'pending'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showFeeSettingsModal, setShowFeeSettingsModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [reuploadUserId, setReuploadUserId] = useState<string | null>(null);
  const [reuploadUserName, setReuploadUserName] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({ japanese: false, exchange: false, regularInternational: false });
  const [sortBy, setSortBy] = useState<'furigana' | 'createdAt'>('furigana');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [annualFeeAmount, setAnnualFeeAmount] = useState('2000');
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState('2500');
  // 実在の人だけを名簿に出す。システム行（運営受信箱）と、役職を持たない is_admin
  // （= 移行前の専用アカウント。Truss Admin 等）は除外する。
  // 運営メンバー（役職持ち）は部員タブに並び、役職バッジで区別される
  const humanMembers = useMemo(
    () => approvedMembers.filter((m) => !isSystemUser(m) && (!m.isAdmin || isPrivilegedRole(m.role))),
    [approvedMembers]
  );
  // 「部員」と「非会員（未払い）」は役職で分ける。数字が「会費を払った部員の数」を指すようにする
  const memberList = useMemo(() => humanMembers.filter((m) => m.role !== 'non_member'), [humanMembers]);
  const nonMemberList = useMemo(() => humanMembers.filter((m) => m.role === 'non_member'), [humanMembers]);
  const displayedMembers = activeTab === 'members' ? memberList : activeTab === 'nonMembers' ? nonMemberList : pendingUsers;

  const filteredMembers = displayedMembers.filter(member => {
    const q = searchQuery.toLowerCase();
    const qKana = toKatakana(q);
    const memberFurigana = (member.furigana || '').toLowerCase();
    const memberFuriganaKana = toKatakana(memberFurigana);
    const matchesSearch =
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      memberFurigana.includes(q) ||
      memberFuriganaKana.includes(qKana);
    if (!matchesSearch) return false;
    const categoryFilters = [filters.japanese, filters.regularInternational, filters.exchange];
    const anyCategorySelected = categoryFilters.some(f => f);
    if (anyCategorySelected) {
      const matchesCategory = (filters.japanese && member.category === 'japanese') || (filters.regularInternational && member.category === 'regular-international') || (filters.exchange && member.category === 'exchange');
      if (!matchesCategory) return false;
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
    // 役職者（代表 → 副代表 → 役職者 → 顧問教員）は並び替えの指定に関わらず先頭へ。
    // 安定ソートなので、同役職どうし・一般部員どうしは上の並びを保つ
    return members.sort(
      (a, b) => ROLE_LIST_PRIORITY[a.role ?? 'member'] - ROLE_LIST_PRIORITY[b.role ?? 'member']
    );
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
    // 会費の記録を書き換える破壊的な操作なので、削除と同じく確認を挟む
    if (!window.confirm(t.confirmBulkMarkPaid)) return;
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
    a.download = `members_${toLocalDateKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t.csvDownloaded);
  };
  const handleBulkDownloadXlsx = async () => {
    const rows = getSelectedMemberList();
    if (rows.length === 0) return toast.error(t.noMemberSelected);
    // xlsx は 7MB 超あるので、ダウンロード操作の時だけ読み込む
    const XLSX = await import('xlsx');
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
    XLSX.writeFile(workbook, `members_${toLocalDateKey()}.xlsx`);
    toast.success(t.xlsxDownloaded);
  };
  const handleBulkDownloadTemplate = async () => {
    const rows = getSelectedMemberList();
    if (rows.length === 0) return toast.error(t.noMemberSelected);
    try {
      const [ExcelJSModule, response] = await Promise.all([
        import('exceljs'),
        fetch('/20260401_03_buinmeibo.xlsx'),
      ]);
      if (!response.ok) throw new Error(`Template fetch failed: ${response.status}`);
      const buffer = await response.arrayBuffer();
      const ExcelJS = ExcelJSModule.default ?? ExcelJSModule;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('提出用');
      if (!sheet) throw new Error('提出用 sheet missing');

      const TEMPLATE_ROWS = 55;
      const LAST_TEMPLATE_ROW = 11 + TEMPLATE_ROWS; // row 66 (採番=55)
      if (rows.length > TEMPLATE_ROWS) {
        const extra = rows.length - TEMPLATE_ROWS;
        sheet.duplicateRow(LAST_TEMPLATE_ROW, extra, false);
        for (let i = 0; i < extra; i++) {
          sheet.getCell(`C${LAST_TEMPLATE_ROW + 1 + i}`).value = TEMPLATE_ROWS + 1 + i;
        }
      }

      const now = new Date();
      sheet.getCell('J3').value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日現在`;
      sheet.getCell('E4').value = '神戸大学留学生支援サークル Truss';
      sheet.getCell('G5').value = rows.length;

      rows.forEach((m, i) => {
        const r = 12 + i;
        sheet.getCell(`E${r}`).value = m.studentNumber ?? '';
        sheet.getCell(`F${r}`).value = m.name;
        sheet.getCell(`G${r}`).value = m.phone ?? '';
        sheet.getCell(`H${r}`).value = m.email;
        sheet.getCell(`I${r}`).value = m.organizations ?? '';
      });

      const out = await workbook.xlsx.writeBuffer();
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `部員名簿_${toLocalDateKey(now)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(t.templateDownloaded);
    } catch (err) {
      console.error('[AdminMembers] template download failed', err);
      toast.error(t.templateDownloadFailed);
    }
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
    setShowBulkActionsModal(true);
  };

  const openFeeSettingsModal = async () => {
    try {
      const settings = await queryFeeSettings();
      setAnnualFeeAmount(String(settings.annualFee));
      setAdmissionFeeAmount(String(settings.admissionFee));
    } catch {
      // 取得失敗時は画面上の値をそのまま使う（デフォルトあり）
    } finally {
      setShowFeeSettingsModal(true);
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
    setShowFeeSettingsModal(false);
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

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="relative">
          <div className="flex items-start gap-2 overflow-x-auto">
            {([
              { key: 'members' as const, icon: Users2, label: `${t.membersTab}（${memberList.length}）` },
              { key: 'nonMembers' as const, icon: UserMinus, label: `${t.nonMembersTab}（${nonMemberList.length}）` },
              { key: 'pending' as const, icon: UserCheck, label: t.pendingTab },
            ]).map(({ key, icon: TabIcon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} className="h-[50px] relative shrink-0">
                <div className={`flex items-center gap-2 px-4 h-full border-b-2 ${activeTab === key ? 'border-[#3D3D4E]' : 'border-transparent'}`}>
                  <TabIcon className={`w-5 h-5 ${activeTab === key ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`} />
                  <span className={`font-normal leading-[24px] text-[16px] tracking-[-0.3125px] whitespace-nowrap ${activeTab === key ? 'text-[#3D3D4E]' : 'text-[#6B6B7A]'}`}>{label}</span>
                  {key === 'pending' && pendingUsers.length > 0 && (
                    <div className="min-w-[20px] h-[20px] bg-[#D4183D] rounded-full flex items-center justify-center px-1.5">
                      <span className="text-white text-xs font-semibold leading-none">{pendingUsers.length}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-b border-[#E5E7EB]" />
        </div>

        {activeTab !== 'pending' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* 検索と並び替えを1行に。年会費のフィルタはタブ（部員/非会員）が代替するため廃止 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#99A1AF]" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.search} className="pl-10 bg-[#EEEBE3] border-0 text-[#6B6B7A]" />
              </div>
              <Select value={sortBy} onValueChange={(value: 'furigana' | 'createdAt') => setSortBy(value)}>
                <SelectTrigger className="w-[180px] bg-[#EEEBE3] border-0 text-[#3D3D4E]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="furigana">{t.sortByFurigana}</SelectItem>
                  <SelectItem value="createdAt">{t.sortByRegisteredAt}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-[110px] bg-[#EEEBE3] border-0 text-[#3D3D4E]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{t.sortOrderAsc}</SelectItem>
                  <SelectItem value="desc">{t.sortOrderDesc}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* 区分の絞り込みはトグルチップで（チェックボックスのカードは場所を取りすぎた）。
                人数はこのタブに何人いるか（選ぶ前に分かるよう、検索や他チップは加味しない） */}
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { key: 'japanese' as const, label: `${t.japanese}（${displayedMembers.filter((m) => m.category === 'japanese').length}）` },
                { key: 'regularInternational' as const, label: `${t.regularInternational}（${displayedMembers.filter((m) => m.category === 'regular-international').length}）` },
                { key: 'exchange' as const, label: `${t.exchange}（${displayedMembers.filter((m) => m.category === 'exchange').length}）` },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggleFilter(key)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    filters[key]
                      ? 'border-[#49B1E4] bg-[#49B1E4] text-white'
                      : 'border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {activeTab !== 'pending' && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={handleToggleAll}
                  className="size-[18px] border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]"
                />
                <span className="text-xs text-[#6B6B7A]">
                  {t.selectedCount}: {selectedCount}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Button variant="outline" size="sm" onClick={() => void openFeeSettingsModal()} title={t.feePriceSetting} className="gap-1.5 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"><Settings2 className="w-4 h-4" />{t.feePriceSetting}</Button>
                <Button onClick={() => void openBulkActionsModal()} disabled={selectedCount === 0} size="sm" title={language === 'ja' ? '選択したメンバーへの一括操作（メッセージ送信・会費確認・名簿出力など）' : 'Bulk actions for selected members'} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white gap-1.5"><ListChecks className="w-4 h-4" />{t.bulkAction}</Button>
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
                        <Skeleton className="h-8 w-28 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                      </div>
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
                      <div className="ml-9 flex flex-col items-start gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-8 w-28 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && sortedMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => { setSelectedUser(member); setShowDetailModal(true); }}
                className="bg-white rounded-[14px] border border-[rgba(61,61,78,0.15)] p-4 cursor-pointer transition-shadow hover:shadow-md"
              >
                <div className="hidden md:flex items-center gap-4">
                  {/* チェックとチャットは行クリック（詳細を開く）に伝播させない */}
                  <Checkbox checked={selectedMembers.has(member.id)} onCheckedChange={() => handleToggleMember(member.id)} onClick={(e) => e.stopPropagation()} className="size-5 shrink-0 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" />
                  <UserAvatarImage
                    avatarPath={member.avatarPath}
                    name={member.name}
                    className="h-12 w-12 shrink-0"
                    fallbackClassName="bg-transparent font-normal text-white"
                    style={{ backgroundImage: 'linear-gradient(135deg, rgb(21, 93, 252) 0%, rgb(152, 16, 250) 100%)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <h3 className="truncate text-base font-normal text-[#101828]">{member.name}</h3>
                      {/* 役職バッジ = 運営権限あり（役職連動）。運営の盾バッジは役職バッジに置き換えた */}
                      {isPrivilegedRole(member.role) && <RoleBadge role={member.role} language={language} className="shrink-0" />}
                      {!member.feePaid && <FeeUnpaidWalletIcon tooltip={t.feeUnpaidTooltip} />}
                      {/* 学籍番号から推測した学年と入力が食い違う（留年等もあるため確認のヒント） */}
                      {isGradeSuspicious(member) && <Badge className="shrink-0 border-0 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{language === 'ja' ? '学年要確認' : 'Check grade'}</Badge>}
                    </div>
                    <p className="truncate text-sm text-[#4A5565]">{member.email}</p>
                    {member.studentNumber && <p className="text-xs text-[#6A7282]">{t.studentNumberLabel}: {member.studentNumber}</p>}
                  </div>
                  <Badge className={`${getCategoryColor(member.category)} shrink-0 border-0 px-2 py-0.5 text-xs font-medium`}>{getCategoryLabel(member.category)}</Badge>
                  <Button onClick={(e) => { e.stopPropagation(); if (onOpenChat) onOpenChat(member.id); }} variant="outline" size="icon" title={t.chat} className="h-8 w-8 shrink-0 border-[rgba(61,61,78,0.15)] bg-[#F5F1E8] text-[#3D3D4E] hover:bg-[#E8E4DB]"><MessageCircle className="w-4 h-4" /></Button>
                </div>

                <div className="md:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedMembers.has(member.id)} onCheckedChange={() => handleToggleMember(member.id)} onClick={(e) => e.stopPropagation()} className="mt-1 size-4 shrink-0 border-[#49B1E4] data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" />
                    <UserAvatarImage
                      avatarPath={member.avatarPath}
                      name={member.name}
                      className="h-10 w-10 shrink-0"
                      fallbackClassName="bg-transparent font-normal text-sm text-white"
                      style={{ backgroundImage: 'linear-gradient(135deg, rgb(21, 93, 252) 0%, rgb(152, 16, 250) 100%)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <h3 className="truncate text-sm font-normal text-[#101828]">{member.name}</h3>
                          {isPrivilegedRole(member.role) && <RoleBadge role={member.role} language={language} className="shrink-0" />}
                          {!member.feePaid && <FeeUnpaidWalletIcon tooltip={t.feeUnpaidTooltip} />}
                          {isGradeSuspicious(member) && <Badge className="shrink-0 border-0 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{language === 'ja' ? '学年要確認' : 'Check grade'}</Badge>}
                        </div>
                      </div>
                      <p className="truncate text-xs text-[#4A5565]">{member.email}</p>
                      {member.studentNumber && <p className="text-xs text-[#6A7282]">{t.studentNumberLabel}: {member.studentNumber}</p>}
                    </div>
                  </div>
                  <div className="ml-9 flex items-center gap-2">
                    <Badge className={`${getCategoryColor(member.category)} border-0 px-2 py-0.5 text-xs font-medium`}>{getCategoryLabel(member.category)}</Badge>
                    <Button onClick={(e) => { e.stopPropagation(); if (onOpenChat) onOpenChat(member.id); }} variant="outline" size="icon" title={t.chat} className="h-7 w-7 border-[rgba(61,61,78,0.15)] bg-[#F5F1E8] text-[#3D3D4E] hover:bg-[#E8E4DB]"><MessageCircle className="h-3.5 w-3.5" /></Button>
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
          <DialogContent className="max-w-md bg-[#F5F1E8]">
            <DialogHeader>
              <DialogTitle className="text-[#3D3D4E]">{t.bulkActionTitle}</DialogTitle>
            </DialogHeader>
            {/* 操作は白地のリストで統一し、目を引く色は使わない（危険な削除だけ赤）。
                以前は全ボタンが primary の青一色で、削除と閉じるの区別すら付かなかった */}
            <div className="space-y-4 py-1">
              <div className="text-sm text-[#6B6B7A]">{t.selectedCount}: {selectedCount}</div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowBulkActionsModal(false); handleBulkEmail(); }}
                  className="w-full justify-start gap-2 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"
                >
                  <Send className="w-4 h-4 text-[#49B1E4]" />
                  {t.sendBulkEmail}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleBulkConfirmFeePaymentKeepType()}
                  className="w-full justify-start gap-2 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"
                >
                  <CircleCheck className="w-4 h-4 text-[#00A63E]" />
                  {t.markPaidInBulk}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#6B6B7A]">{t.downloadInfo}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleBulkDownloadCsv} className="gap-1.5 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"><Download className="w-3.5 h-3.5" />{t.downloadCsv}</Button>
                  <Button variant="outline" size="sm" onClick={handleBulkDownloadXlsx} className="gap-1.5 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"><Download className="w-3.5 h-3.5" />{t.downloadXlsx}</Button>
                  <Button variant="outline" size="sm" onClick={() => void handleBulkDownloadTemplate()} className="gap-1.5 border-[rgba(61,61,78,0.2)] bg-white text-[#3D3D4E] hover:bg-[#EEEBE3]"><Download className="w-3.5 h-3.5" />{t.downloadTemplate}</Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[rgba(61,61,78,0.15)] pt-4">
                <Button
                  variant="outline"
                  onClick={() => void handleBulkDelete()}
                  className="gap-1.5 border-[#D4183D] text-[#D4183D] hover:bg-[#D4183D] hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.bulkDelete}
                </Button>
                <Button variant="ghost" onClick={() => setShowBulkActionsModal(false)} className="text-[#3D3D4E] hover:bg-[#EEEBE3]">{t.close}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 会費の設定（全体設定）。選択メンバーへの一括操作とは無関係なので別ダイアログにした */}
      {showFeeSettingsModal && (
        <Dialog open={showFeeSettingsModal} onOpenChange={setShowFeeSettingsModal}>
          <DialogContent className="max-w-sm bg-[#F5F1E8]">
            <DialogHeader>
              <DialogTitle className="text-[#3D3D4E]">{t.feePriceSetting}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#3D3D4E]">{t.annualFee}</label>
                  <Input value={annualFeeAmount} onChange={(e) => setAnnualFeeAmount(e.target.value)} className="bg-[#EEEBE3] border-0" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#3D3D4E]">{t.admissionFee}</label>
                  <Input value={admissionFeeAmount} onChange={(e) => setAdmissionFeeAmount(e.target.value)} className="bg-[#EEEBE3] border-0" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowFeeSettingsModal(false)} className="text-[#3D3D4E] hover:bg-[#EEEBE3]">{t.close}</Button>
                <Button onClick={() => void handleSaveFeeSettings()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">{t.applyPriceSetting}</Button>
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
          onSetRole={onSetUserRole ? async (role) => {
            const result = await onSetUserRole(selectedUser.id, role);
            // 成功したときだけ表示へ反映する（失敗の案内はモーダル側が出す）。
            // is_admin は DB トリガー（migration 039）が役職に連動して切り替える
            if (!result.error) setSelectedUser({ ...selectedUser, role, isAdmin: isPrivilegedRole(role) });
            return result;
          } : undefined}
          onRoleTransferred={(role) => {
            // 引き継いだ役職は必ず運営権限つき（DB トリガーが連動）
            setSelectedUser({ ...selectedUser, role, isAdmin: true });
          }}
          isSelf={currentAdmin?.id === selectedUser.id}
        />
      )}
    </div>
  );
}
