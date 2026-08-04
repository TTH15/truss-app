import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { withdrawOwnAccount } from '@truss/core';
import type { Language } from '@truss/core';

const CONFIRM_WORD = '退会';

const translations = {
  ja: {
    title: '退会する',
    description:
      '退会すると、氏名・メールアドレス・電話番号・プロフィール画像などの個人情報は削除され、ログインできなくなります。',
    retained:
      'なお、年会費のお支払い状況の記録は残ります（未払いのまま退会した場合、同じ学籍番号で再登録しても未払いのまま引き継がれます）。',
    irreversible: 'この操作は取り消せません。',
    open: '退会手続きへ',
    confirmTitle: '本当に退会しますか？',
    confirmPrompt: `確認のため「${CONFIRM_WORD}」と入力してください。`,
    cancel: 'キャンセル',
    submit: '退会する',
    working: '手続き中...',
    failed: '退会に失敗しました',
    done: '退会しました。ご利用ありがとうございました。',
  },
  en: {
    title: 'Close your account',
    description:
      'Closing your account deletes your name, email, phone number and profile photo, and you will no longer be able to sign in.',
    retained:
      'Your annual fee status is kept: if you leave with the fee unpaid, registering again with the same student ID resumes as unpaid.',
    irreversible: 'This cannot be undone.',
    open: 'Continue to close account',
    confirmTitle: 'Close your account?',
    confirmPrompt: `Type "${CONFIRM_WORD}" to confirm.`,
    cancel: 'Cancel',
    submit: 'Close account',
    working: 'Working...',
    failed: 'Could not close the account',
    done: 'Your account has been closed. Thank you for being with us.',
  },
};

/**
 * 本人による退会。
 * 行は物理削除せず個人情報だけを消す（他の会員の投稿や写真が参照を失わないように、
 * また未払いのまま作り直して会費を回避できないように）。
 */
export function WithdrawAccount({ language, onWithdrawn }: { language: Language; onWithdrawn: () => void }) {
  const t = translations[language];
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleWithdraw = async () => {
    if (confirmText.trim() !== CONFIRM_WORD || busy) return;
    setBusy(true);
    try {
      const { error } = await withdrawOwnAccount();
      if (error) throw error;
      toast.success(t.done, { duration: 8000 });
      setOpen(false);
      onWithdrawn();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`${t.failed}: ${detail}`, { duration: 10000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-[#F0C6C6]">
      <CardHeader>
        <CardTitle className="text-[#B01432]">{t.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[#6B6B7A]">{t.description}</p>
        <p className="text-sm text-[#6B6B7A]">{t.retained}</p>
        <p className="text-sm font-medium text-[#B01432]">{t.irreversible}</p>
        <Button variant="outline" className="border-[#D4183D] text-[#D4183D] hover:bg-[#FEF2F2]" onClick={() => setOpen(true)}>
          {t.open}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmText(''); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#B01432]">{t.confirmTitle}</DialogTitle>
            <DialogDescription>{t.confirmPrompt}</DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button
              className="flex-1 bg-[#D4183D] hover:bg-[#B01432] text-white"
              onClick={handleWithdraw}
              disabled={busy || confirmText.trim() !== CONFIRM_WORD}
            >
              {busy ? t.working : t.submit}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
