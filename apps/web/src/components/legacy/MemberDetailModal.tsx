import { X, Trash2, CheckCircle2, XCircle, Plus, ArrowLeftRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DatePicker } from '@platform/ui';
import { toast } from 'sonner';
import type { Language, User, UserRole, UserRoleHistoryEntry } from '@truss/core';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  isFeeDerivedRole,
  toLocalDateKey,
  queryUserRoleHistory,
  addUserRoleHistoryRow,
  deleteUserRoleHistoryRow,
  isGradeSuspicious,
  enrolledYearsFromStudentNumber,
} from '@truss/core';
import { RoleBadge } from './RoleBadge';
import { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext';

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
  onSetRole?: (role: UserRole) => void;
  /** 引き継ぎ（前任降格 + 後任昇格）が完了したとき。親が保持する表示用 user の更新に使う */
  onRoleTransferred?: (role: UserRole) => void;
  /** 自分自身の詳細を開いている場合 true（役職の自己変更 = 運営権限の自己剥奪を防ぐ） */
  isSelf?: boolean;
}

/** 引き継ぎ対象（1人制約のある役職） */
const TRANSFERABLE_ROLES = ['president', 'vice_president'] as const;
type TransferableRole = (typeof TRANSFERABLE_ROLES)[number];
/** 手動登録できる役職（部員/非会員は会費連動なので履歴対象外） */
const HISTORY_ROLES: UserRole[] = ['officer', 'vice_president', 'president', 'advisor'];

const translations = {
  ja: { applicationDate: '申請日', nickname: 'ニックネーム', id: 'ID', email: 'メールアドレス', phone: '電話番号', studentNumber: '学生番号', major: '学部学科', category: '区分', grade: '学年', birthCountry: '生まれた国', languages: '話せる言語', approve: '承認する', reject: '拒否する', delete: '削除', confirmDelete: '本当にこのメンバーを削除しますか？', confirmDeleteMessage: 'この操作は取り消せません。', cancel: 'キャンセル', japanese: '日本人学生・国内学生', regularInternational: '正規留学生', exchange: '交換留学生', feeStatus: '会費状況', feePaid: '支払い済み', feeUnpaid: '未払い', confirmFeePayment: '支払い確認', renewal: '継続会員', newMember: '新規会員', renewalFee: '¥2,000（年会費のみ）', newMemberFee: '¥2,500（入会金+年会費）', membershipYear: '会員年度', confirmAsRenewal: '継続として確認（¥2,000）', confirmAsNew: '新規として確認（¥2,500）', setAsRenewal: '継続会員に設定', setAsNew: '新規会員に設定', memberTypeHint: '※3/31までに登録完了した会員は「継続」扱い', adminFlag: '運営権限', adminFlagOn: '運営権限あり', adminFlagOff: '運営権限なし', adminFlagHint: '運営権限は役職に連動します。「部員」「非会員」以外の役職にすると、運営画面へのアクセス・会員の承認・通知の送信ができるようになります', roleSelfHint: '自分の役職は変更できません（誤って自分の運営権限を外してしまうのを防ぐため）', roleSeHint: 'SE はシステム管理用の役職です。ここからは変更できません', role: '役職', roleHint: '役職はプロフィールや名簿にバッジとして表示されます。「非会員／部員」は年会費の支払い状況に連動して自動で切り替わります。部員・非会員以外の役職には運営権限が付きます',
    transferTitle: '役職の引き継ぎ', transferMessage: (roleLabel: string, holderName: string, successorName: string) => `${roleLabel}は現在 ${holderName} さんです。${successorName} さんに引き継ぎますか？`, predecessorNewRole: '前任の引き継ぎ後の役職', transferConfirm: '引き継ぐ', transferring: '引き継ぎ中...', transferDone: '役職を引き継ぎました', transferFailed: '引き継ぎに失敗しました',
    roleHistory: '役職履歴', roleHistoryEmpty: '記録はまだありません', roleHistoryCurrent: '在任中', roleHistoryAuto: '自動記録', addHistory: '過去の役職を記録', historyRole: '役職', historyStart: '開始日', historyEnd: '終了日（任意）', historyNote: 'メモ（任意）', historyNotePlaceholder: '2024年度 など', historyAdd: '登録する', historyAdded: '役職履歴を登録しました', historyAddFailed: '登録に失敗しました', historyNeedsFields: '役職と開始日を入力してください', historyDeleted: '履歴を削除しました' },
  en: { applicationDate: 'Application Date', nickname: 'Nickname', id: 'ID', email: 'Email', phone: 'Phone Number', studentNumber: 'Student Number', major: 'Major', category: 'Category', grade: 'Grade', birthCountry: 'Birth Country', languages: 'Languages', approve: 'Approve', reject: 'Reject', delete: 'Delete', confirmDelete: 'Are you sure you want to delete this member?', confirmDeleteMessage: 'This action cannot be undone.', cancel: 'Cancel', japanese: 'Japanese Student', regularInternational: 'Regular International', exchange: 'Exchange Student', feeStatus: 'Fee Status', feePaid: 'Paid', feeUnpaid: 'Unpaid', confirmFeePayment: 'Confirm Payment', renewal: 'Renewal', newMember: 'New Member', renewalFee: '¥2,000 (Annual fee only)', newMemberFee: '¥2,500 (Entry + Annual)', membershipYear: 'Membership Year', confirmAsRenewal: 'Confirm as Renewal (¥2,000)', confirmAsNew: 'Confirm as New (¥2,500)', setAsRenewal: 'Set as Renewal', setAsNew: 'Set as New Member', memberTypeHint: '* Members registered by 3/31 are treated as "Renewal"', adminFlag: 'Admin access', adminFlagOn: 'Has admin access', adminFlagOff: 'No admin access', adminFlagHint: 'Admin access follows the role. Any role other than Member / Non-member grants access to the admin panel, member approval, and notifications.', roleSelfHint: 'You cannot change your own role (prevents accidentally removing your own admin access).', roleSeHint: 'SE is a system-administration role and cannot be changed here.', role: 'Role', roleHint: 'Shown as a badge on profiles and the member list. Non-member and Member follow the annual fee status automatically. Roles above Member also grant admin access',
    transferTitle: 'Transfer Role', transferMessage: (roleLabel: string, holderName: string, successorName: string) => `${holderName} currently holds the ${roleLabel} role. Transfer it to ${successorName}?`, predecessorNewRole: "Predecessor's new role", transferConfirm: 'Transfer', transferring: 'Transferring...', transferDone: 'Role transferred', transferFailed: 'Failed to transfer role',
    roleHistory: 'Role History', roleHistoryEmpty: 'No records yet', roleHistoryCurrent: 'Current', roleHistoryAuto: 'Auto', addHistory: 'Record a past role', historyRole: 'Role', historyStart: 'Start date', historyEnd: 'End date (optional)', historyNote: 'Note (optional)', historyNotePlaceholder: 'e.g. AY2024', historyAdd: 'Add', historyAdded: 'Role history added', historyAddFailed: 'Failed to add history', historyNeedsFields: 'Role and start date are required', historyDeleted: 'History entry deleted' }
};

export function MemberDetailModal({ isOpen, onClose, user, language, isPending = false, onApprove, onReject, onDelete, onConfirmFeePayment, onSetRole, onRoleTransferred, isSelf = false }: MemberDetailModalProps) {
  const t = translations[language];
  const { approvedMembers, transferRole } = useData();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 引き継ぎ確認（1人制約のある役職を、現在の保持者がいる状態で選んだとき）
  const [pendingTransfer, setPendingTransfer] = useState<{ role: TransferableRole; holderName: string } | null>(null);
  const [predecessorNewRole, setPredecessorNewRole] = useState<'member' | 'officer'>('member');
  const [transferring, setTransferring] = useState(false);
  // 役職履歴
  const [history, setHistory] = useState<UserRoleHistoryEntry[]>([]);
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [newRole, setNewRole] = useState<UserRole | ''>('');
  const [newStart, setNewStart] = useState<Date | undefined>(undefined);
  const [newEnd, setNewEnd] = useState<Date | undefined>(undefined);
  const [newNote, setNewNote] = useState('');
  const [savingHistory, setSavingHistory] = useState(false);

  const showRoleSection = !isPending && !!onSetRole;

  useEffect(() => {
    if (!isOpen || !showRoleSection) return;
    let cancelled = false;
    void (async () => {
      const rows = await queryUserRoleHistory(user.id);
      if (!cancelled) setHistory(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, showRoleSection, user.id]);

  if (!isOpen) return null;
  const getCategoryLabel = (category: string) => category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-[#dbeafe] text-[#193cb8]' : category === 'regular-international' ? 'bg-[rgba(132,212,97,0.3)] text-[#00a63e]' : category === 'exchange' ? 'bg-[#fce7f3] text-[#be185d]' : 'bg-gray-100 text-gray-800';

  const isFeePaid = !!user.feePaid;
  const isRenewal = !!user.isRenewal;
  const feeAmountLabel = isRenewal ? t.renewalFee : t.newMemberFee;
  const feeBadgeClass = isFeePaid
    ? 'bg-[#dcfce7] text-[#166534]'
    : 'bg-[#fee2e2] text-[#991b1b]';

  const formatDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US');

  const handleRoleSelect = (value: UserRole) => {
    // 代表・副代表は同時に1人まで（DB のユニークインデックスでも強制）。
    // 別の保持者がいる場合はそのまま変更せず、引き継ぎ確認へ
    if ((TRANSFERABLE_ROLES as readonly string[]).includes(value)) {
      const holder = approvedMembers.find((m) => m.role === value && m.id !== user.id);
      if (holder) {
        setPredecessorNewRole('member');
        setPendingTransfer({ role: value as TransferableRole, holderName: holder.name });
        return;
      }
    }
    onSetRole?.(value);
  };

  const executeTransfer = async () => {
    if (!pendingTransfer) return;
    setTransferring(true);
    const { error } = await transferRole(user.id, pendingTransfer.role, predecessorNewRole);
    setTransferring(false);
    if (error) {
      toast.error(t.transferFailed);
      return;
    }
    toast.success(t.transferDone);
    onRoleTransferred?.(pendingTransfer.role);
    setPendingTransfer(null);
    // 引き継ぎで履歴も動くので取り直す
    setHistory(await queryUserRoleHistory(user.id));
  };

  const handleAddHistory = async () => {
    if (!newRole || !newStart) {
      toast.error(t.historyNeedsFields);
      return;
    }
    setSavingHistory(true);
    const { error } = await addUserRoleHistoryRow({
      userId: user.id,
      role: newRole,
      startedOn: toLocalDateKey(newStart),
      endedOn: newEnd ? toLocalDateKey(newEnd) : null,
      note: newNote.trim() || null,
    });
    setSavingHistory(false);
    if (error) {
      toast.error(t.historyAddFailed);
      return;
    }
    toast.success(t.historyAdded);
    setNewRole('');
    setNewStart(undefined);
    setNewEnd(undefined);
    setNewNote('');
    setShowAddHistory(false);
    setHistory(await queryUserRoleHistory(user.id));
  };

  const handleDeleteHistory = async (id: number) => {
    const { error } = await deleteUserRoleHistoryRow(id);
    if (error) return;
    toast.success(t.historyDeleted);
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* PC ではスクロール無しで全体が見えるよう横長 2 カラム、スマホでは従来どおり縦積み */}
      <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[510px] lg:max-w-[980px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
          <div className="flex items-start justify-between">
            <div className="space-y-2"><div className="flex items-center gap-2 flex-wrap"><h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{user.name}</h2><RoleBadge role={user.role} language={language} /></div><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.furigana}</p><p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">{t.applicationDate}: 2026-01-13</p></div>
            <button onClick={onClose} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70 p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-x-10 lg:items-start">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.nickname}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.nickname || '-'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.email}</p><p className="text-[#101828] text-base tracking-[-0.3125px] break-all">{user.email}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.phone}</p><p className="text-[#101828] text-base tracking-[-0.3125px] break-all">{user.phone || '-'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.studentNumber}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.studentNumber || '1234567A'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.major}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.major || (language === 'ja' ? '理学部 物理学科' : 'Physics Dept.')}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.category}</p><Badge className={`${getCategoryColor(user.category)} border-0 font-medium text-xs px-2 py-0.5 mt-1`}>{getCategoryLabel(user.category)}</Badge></div>
            <div>
              <p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.grade}</p>
              <p className="text-[#101828] text-base tracking-[-0.3125px]">{user.grade || '3'}</p>
              {/* 学籍番号からの推測と食い違う場合のヒント（留年・休学もあるため参考情報） */}
              {isGradeSuspicious(user) && (() => {
                const enrolled = enrolledYearsFromStudentNumber(user.studentNumber);
                if (!enrolled) return null;
                return (
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                    {language === 'ja'
                      ? `学籍番号からは在籍${enrolled.years}年目（${enrolled.admissionYear}年度入学）と推測されます。留年・休学の場合はそのままで問題ありません`
                      : `Student number suggests year ${enrolled.years} (admitted ${enrolled.admissionYear}). This is fine if the member repeated a year or took leave.`}
                  </p>
                );
              })()}
            </div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.birthCountry}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.birthCountry || '-'}</p></div>
            <div><p className="text-[#4A5565] text-sm tracking-[-0.1504px] mb-1">{t.languages}</p><p className="text-[#101828] text-base tracking-[-0.3125px]">{user.languages || '-'}</p></div>
          </div>

          <div className="lg:border-l lg:border-[rgba(61,61,78,0.15)] lg:pl-8">
          {showRoleSection && (
            <div className="mt-8 pt-6 border-t border-[rgba(61,61,78,0.15)] lg:mt-0 lg:pt-0 lg:border-t-0 space-y-2">
              <div className="font-semibold text-[#3D3D4E] tracking-[-0.1504px]">
                {t.role}
              </div>
              <Select
                value={user.role ?? 'member'}
                onValueChange={(value) => handleRoleSelect(value as UserRole)}
                disabled={isSelf || user.role === 'se'}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* SE はシステム管理用の特別役職。UI からは付与できない（表示用にのみ出す） */}
                  {user.role === 'se' && (
                    <SelectItem value="se" disabled>
                      {USER_ROLE_LABELS.se[language]}
                    </SelectItem>
                  )}
                  {USER_ROLES.map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                      // 非会員／部員は会費の支払い状況に連動して自動で切り替わる。
                      // 手で選べると会費と食い違うため、現在値としては表示しつつ選択はさせない
                      disabled={isFeeDerivedRole(role) && role !== (user.role ?? 'member')}
                    >
                      {USER_ROLE_LABELS[role][language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B6B7A]">
                {user.role === 'se' ? t.roleSeHint : isSelf ? t.roleSelfHint : t.roleHint}
              </p>
            </div>
          )}

          {!isPending && (
            <div className="mt-8 pt-6 border-t border-[rgba(61,61,78,0.15)] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold text-[#3D3D4E] tracking-[-0.1504px]">{t.adminFlag}</div>
                <Badge className={user.isAdmin ? 'bg-[#3D3D4E] text-white border-0' : 'bg-gray-200 text-gray-700 border-0'}>
                  {user.isAdmin ? t.adminFlagOn : t.adminFlagOff}
                </Badge>
              </div>
              {/* 手動での付与・剥奪は無し。役職（上のセレクト）を変えると DB トリガーが連動して切り替える */}
              <p className="text-xs text-[#6B6B7A]">{t.adminFlagHint}</p>
            </div>
          )}

          {showRoleSection && (
            <div className="mt-8 pt-6 border-t border-[rgba(61,61,78,0.15)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-[#3D3D4E] tracking-[-0.1504px]">{t.roleHistory}</div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#49B1E4]" onClick={() => setShowAddHistory((v) => !v)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t.addHistory}
                </Button>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-[#6B6B7A]">{t.roleHistoryEmpty}</p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 text-sm text-[#3D3D4E] bg-white/60 rounded-md px-2.5 py-1.5">
                      <span className="font-medium">{USER_ROLE_LABELS[entry.role][language]}</span>
                      <span className="text-xs text-[#6B6B7A]">
                        {formatDate(entry.startedOn)} 〜 {entry.endedOn ? formatDate(entry.endedOn) : t.roleHistoryCurrent}
                      </span>
                      {entry.note && <span className="text-xs text-[#6B6B7A] truncate">{entry.note}</span>}
                      {entry.source === 'auto' && (
                        <Badge className="bg-gray-200 text-gray-600 border-0 text-[10px] px-1.5 py-0">{t.roleHistoryAuto}</Badge>
                      )}
                      <button
                        onClick={() => void handleDeleteHistory(entry.id)}
                        className="ml-auto text-[#6B6B7A] hover:text-[#D4183D] p-1"
                        title={t.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showAddHistory && (
                <div className="space-y-2 rounded-lg border border-[rgba(61,61,78,0.15)] bg-white/60 p-3">
                  <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                    <SelectTrigger className="w-full bg-white h-9">
                      <SelectValue placeholder={t.historyRole} />
                    </SelectTrigger>
                    <SelectContent>
                      {HISTORY_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{USER_ROLE_LABELS[role][language]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker value={newStart} onChange={setNewStart} placeholder={t.historyStart} buttonClassName="bg-white h-9 w-full" />
                    <DatePicker value={newEnd} onChange={setNewEnd} placeholder={t.historyEnd} buttonClassName="bg-white h-9 w-full" />
                  </div>
                  <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t.historyNotePlaceholder} className="bg-white h-9" />
                  <Button onClick={() => void handleAddHistory()} disabled={savingHistory} size="sm" className="w-full bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">
                    {t.historyAdd}
                  </Button>
                </div>
              )}
            </div>
          )}

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
            <div className="flex gap-2 mt-8 lg:mt-0">
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
        </div>

        {pendingTransfer && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { e.stopPropagation(); if (!transferring) setPendingTransfer(null); }}>
            <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[420px] shadow-xl border border-[rgba(61,61,78,0.15)] relative m-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[rgba(61,61,78,0.15)]">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px] flex items-center gap-2">
                      <ArrowLeftRight className="w-5 h-5" />
                      {t.transferTitle}
                    </h2>
                    <p className="text-[#3D3D4E] text-sm tracking-[-0.1504px] leading-relaxed">
                      {t.transferMessage(USER_ROLE_LABELS[pendingTransfer.role][language], pendingTransfer.holderName, user.name)}
                    </p>
                  </div>
                  <button onClick={() => { if (!transferring) setPendingTransfer(null); }} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"><X className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-[#3D3D4E]">{t.predecessorNewRole}</p>
                  <Select value={predecessorNewRole} onValueChange={(value) => setPredecessorNewRole(value as 'member' | 'officer')}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{USER_ROLE_LABELS.member[language]}</SelectItem>
                      <SelectItem value="officer">{USER_ROLE_LABELS.officer[language]}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-9" disabled={transferring} onClick={() => setPendingTransfer(null)}>
                    {t.cancel}
                  </Button>
                  <Button className="flex-1 bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9" disabled={transferring} onClick={() => void executeTransfer()}>
                    {transferring ? t.transferring : t.transferConfirm}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
            <div className="bg-[#F5F1E8] rounded-[10px] w-full max-w-[400px] shadow-xl border border-[rgba(61,61,78,0.15)] relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[rgba(61,61,78,0.15)]"><div className="flex items-start justify-between"><div className="space-y-2"><h2 className="text-[#3D3D4E] text-lg font-semibold tracking-[-0.4395px]">{t.confirmDelete}</h2><p className="text-[#6B6B7A] text-sm tracking-[-0.1504px]">{t.confirmDeleteMessage}</p></div><button onClick={() => setShowDeleteConfirm(false)} className="text-[#3D3D4E] hover:text-[#1a1a24] transition-colors opacity-70"><X className="w-4 h-4" /></button></div></div>
              <div className="p-6"><div className="flex gap-2 mt-8"><Button onClick={() => { onDelete?.(); setShowDeleteConfirm(false); onClose(); }} className="w-full bg-[#D4183D] hover:bg-[#B01432] text-white h-9 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /><span className="font-medium text-sm tracking-[-0.1504px]">{t.delete}</span></Button></div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
