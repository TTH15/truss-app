import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import type { Language } from '../../domain/types/app';

interface WaitingApprovalProps {
  language: Language;
  email: string;
  onLogout: () => void;
}

const translations = {
  ja: { title: '承認待ち', subtitle: '運営からの承認をお待ちください', emailVerified: 'メール認証', emailVerifiedDesc: '完了', initialRegistration: '初期登録', initialRegistrationDesc: '完了', approval: '運営の承認', approvalDesc: '承認待ち', currentStatus: '現在の状況', statusMessage: 'ご登録ありがとうございます。現在、運営チームがあなたの登録内容を確認しています。承認までしばらくお待ちください。', statusDetail: '承認が完了次第、登録メールアドレスに通知が送信されます。', registeredEmail: '登録メールアドレス', whatNext: '承認後の流れ', nextStepJapanese: '日本人学生・国内学生の方：プロフィール登録と年会費のお支払いが必要です。', nextStepRegular: '正規留学生の方：プロフィール登録が必要です。', nextStepExchange: '交換留学生の方：承認後すぐに全機能をご利用いただけます。', logoutButton: 'ログアウト', step: 'ステップ' },
  en: { title: 'Waiting for Approval', subtitle: 'Please wait for approval from the administration', emailVerified: 'Email Verification', emailVerifiedDesc: 'Completed', initialRegistration: 'Initial Registration', initialRegistrationDesc: 'Completed', approval: 'Admin Approval', approvalDesc: 'Pending', currentStatus: 'Current Status', statusMessage: 'Thank you for your registration. Our team is currently reviewing your application. Please wait for approval.', statusDetail: 'You will receive a notification email once your registration is approved.', registeredEmail: 'Registered Email', whatNext: 'After Approval', nextStepJapanese: 'Japanese Students: Profile registration and annual fee payment required.', nextStepRegular: 'Regular International Students: Profile registration required.', nextStepExchange: 'Exchange Students: You can use all features immediately after approval.', logoutButton: 'Logout', step: 'Step' }
};

export function WaitingApproval({ language, email, onLogout }: WaitingApprovalProps) {
  const t = translations[language];
  const steps = [
    { icon: Mail, title: t.emailVerified, description: t.emailVerifiedDesc, completed: true },
    { icon: CheckCircle2, title: t.initialRegistration, description: t.initialRegistrationDesc, completed: true },
    { icon: Clock, title: t.approval, description: t.approvalDesc, completed: false },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{t.title}</CardTitle>
            <CardDescription className="text-center">{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">{steps.map((step, index) => (
              <div key={index} className="flex items-start gap-4 relative">
                <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${step.completed ? 'bg-[#49B1E4] text-white' : 'bg-gray-200 text-gray-400'}`}>
                  <step.icon className="w-8 h-8" />
                </div>
                <div className="flex-1 pt-3">
                  <h3 className="font-medium text-[#3D3D4E] mb-1">{t.step} {index + 1}: {step.title}</h3>
                  <p className={`text-sm ${step.completed ? 'text-green-600' : 'text-gray-500'}`}>{step.description}</p>
                </div>
              </div>
            ))}</div>
            <div className="bg-[#FFF9E6] border border-[#FFD966] rounded-lg p-4">
              <h3 className="font-medium text-[#3D3D4E] mb-2 flex items-center gap-2"><Clock className="w-5 h-5 text-[#FFB84D]" />{t.currentStatus}</h3>
              <p className="text-sm text-gray-700 mb-2">{t.statusMessage}</p>
              <p className="text-sm text-gray-600">{t.statusDetail}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-600 mb-1">{t.registeredEmail}</p><p className="font-medium text-[#3D3D4E]">{email}</p></div>
            <div className="border-t pt-4"><h3 className="font-medium text-[#3D3D4E] mb-3">{t.whatNext}</h3><div className="space-y-2 text-sm text-gray-700"><p>• {t.nextStepJapanese}</p><p>• {t.nextStepRegular}</p><p>• {t.nextStepExchange}</p></div></div>
            <Button onClick={onLogout} variant="outline" className="w-full">{t.logoutButton}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
