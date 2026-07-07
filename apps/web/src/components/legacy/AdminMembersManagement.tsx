import { AdminMembers } from './AdminMembers';
import type { Language, User } from '../../domain/types/app';

interface AdminMembersManagementProps {
  language: Language;
  pendingUsers: User[];
  approvedMembers: User[];
  isLoading?: boolean;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onRequestReupload?: (userId: string, reasons?: string[]) => void;
  onOpenChat?: (userId: string) => void;
  onSendBulkEmail?: (userIds: string[], subjectJa: string, subjectEn: string, messageJa: string, messageEn: string, sendInApp: boolean, sendEmail: boolean) => void;
  onConfirmFeePayment?: (userId: string, isRenewal: boolean) => void | Promise<void>;
  onSetRenewalStatus?: (userId: string, isRenewal: boolean) => void | Promise<void>;
  onDeleteUser?: (userId: string) => void;
}

export function AdminMembersManagement({ language, pendingUsers, approvedMembers, isLoading = false, onApproveUser, onRejectUser, onRequestReupload, onOpenChat, onSendBulkEmail, onConfirmFeePayment, onSetRenewalStatus, onDeleteUser }: AdminMembersManagementProps) {
  return (
    <AdminMembers
      language={language}
      approvedMembers={approvedMembers}
      pendingUsers={pendingUsers}
      isLoading={isLoading}
      onApproveUser={onApproveUser}
      onRejectUser={onRejectUser}
      onRequestReupload={onRequestReupload}
      onOpenChat={onOpenChat}
      onSendBulkEmail={onSendBulkEmail}
      onConfirmFeePayment={onConfirmFeePayment}
      onSetRenewalStatus={onSetRenewalStatus}
      onDeleteUser={onDeleteUser}
    />
  );
}
