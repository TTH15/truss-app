import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Globe2, MapPin, Mail, Edit, Phone, Users, Save, X, GraduationCap, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import type { Language, User } from '../../domain/types/app';
import { UserAvatarImage } from './UserAvatarImage';
import { ProfileAvatarCropDialog } from './ProfileAvatarCropDialog';
import { uploadUserAvatar } from '../../lib/supabase';

interface ProfilePageProps {
  language: Language;
  user: User;
  isCompact?: boolean;
  /** 互換のため残す（現状未使用） */
  isProfileComplete?: boolean;
  onClose?: () => void;
  /** プロフィール項目の保存（アバターは別途アップロード後に `avatarPath` を渡す） */
  onUpdateProfile?: (updates: Partial<User>) => Promise<{ error: Error | null }>;
}

const translations = {
  ja: {
    title: 'プロフィール',
    basicInfo: '基本情報',
    name: '名前',
    furigana: 'フリガナ',
    nickname: 'ニックネーム',
    birthday: '生年月日',
    languages: '話せる言語',
    birthCountry: '生まれた国',
    category: '区分',
    japanese: '日本人学生・国内学生',
    regularInternational: '正規留学生',
    exchange: '交換留学生',
    phone: '電話番号',
    organizations: '他の所属団体',
    academicInfo: '学籍情報',
    major: '学部学科',
    studentNumber: '学籍番号',
    grade: '学年',
    editProfile: 'プロフィールを編集',
    saveProfile: '保存する',
    cancel: 'キャンセル',
    email: 'メールアドレス',
    awaitingApproval: '承認待ち',
    approvalMessage: '運営による承認後、さらに詳細なプロフィール情報を追加できます。',
    personalInfo: '個人情報',
    changePhoto: '写真を変更',
    saveFailed: '保存に失敗しました',
    saved: '保存しました',
    avatarUploadFailed: '画像のアップロードに失敗しました',
    avatarSaved: 'プロフィール画像を更新しました',
  },
  en: {
    title: 'Profile',
    basicInfo: 'Basic Information',
    name: 'Name',
    furigana: 'Furigana',
    nickname: 'Nickname',
    birthday: 'Birthday',
    languages: 'Languages',
    birthCountry: 'Birth Country',
    category: 'Category',
    japanese: 'Japanese Student',
    regularInternational: 'Regular International',
    exchange: 'Exchange Student',
    phone: 'Phone Number',
    organizations: 'Other Organizations',
    academicInfo: 'Academic Information',
    major: 'Major/Department',
    studentNumber: 'Student Number',
    grade: 'Grade',
    editProfile: 'Edit Profile',
    saveProfile: 'Save',
    cancel: 'Cancel',
    email: 'Email',
    awaitingApproval: 'Awaiting Approval',
    approvalMessage: 'After approval, you can add more detailed profile information.',
    personalInfo: 'Personal Information',
    changePhoto: 'Change photo',
    saveFailed: 'Could not save',
    saved: 'Saved',
    avatarUploadFailed: 'Could not upload image',
    avatarSaved: 'Profile photo updated',
  },
};

export function ProfilePage({
  language,
  user,
  isCompact = false,
  onClose,
  onUpdateProfile,
}: ProfilePageProps) {
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [saving, setSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const getCategoryLabel = (category: string) =>
    category === 'japanese' ? t.japanese : category === 'regular-international' ? t.regularInternational : category === 'exchange' ? t.exchange : '';
  const getCategoryColor = (category: string) =>
    category === 'japanese'
      ? 'bg-blue-100 text-blue-800'
      : category === 'regular-international'
        ? 'bg-purple-100 text-purple-800'
        : category === 'exchange'
          ? 'bg-pink-100 text-pink-800'
          : 'bg-gray-100 text-gray-800';

  const handleSave = async () => {
    if (!onUpdateProfile) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await onUpdateProfile({
        name: editedUser.name,
        furigana: editedUser.furigana,
        nickname: editedUser.nickname,
        birthday: editedUser.birthday,
        languages: editedUser.languages,
        birthCountry: editedUser.birthCountry,
        phone: editedUser.phone,
        organizations: editedUser.organizations,
        major: editedUser.major,
        studentNumber: editedUser.studentNumber,
        grade: editedUser.grade,
      });
      if (error) {
        toast.error(t.saveFailed);
        return;
      }
      toast.success(t.saved);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  const handleAvatarCropped = async (blob: Blob) => {
    if (!onUpdateProfile) return;
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    const { path, error: upErr } = await uploadUserAvatar(user.id, file);
    if (upErr || !path) {
      toast.error(t.avatarUploadFailed);
      return;
    }
    const { error } = await onUpdateProfile({ avatarPath: path });
    if (error) {
      toast.error(t.saveFailed);
      return;
    }
    setEditedUser((prev) => ({ ...prev, avatarPath: path }));
    toast.success(t.avatarSaved);
  };

  const isWaitingApproval = user.registrationStep === 'waiting_approval';

  if (isCompact) {
    return (
      <div className="space-y-4 bg-white">
        <div className="flex items-center gap-4 p-2">
          <UserAvatarImage avatarPath={user.avatarPath} name={user.name} className="w-16 h-16" />
          <div className="flex-1">
            <p className="text-[#3D3D4E]">{user.name}</p>
            {user.nickname && <p className="text-[#6B6B7A] text-sm">{user.nickname}</p>}
            <Badge className={`${getCategoryColor(user.category)} mt-1`}>{getCategoryLabel(user.category)}</Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ProfileAvatarCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        language={language}
        onComplete={handleAvatarCropped}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-[#3D3D4E]">{t.title}</h1>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3]" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              {t.editProfile}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                {t.cancel}
              </Button>
              <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3]" onClick={() => void handleSave()} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {t.saveProfile}
              </Button>
            </div>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-[#3D3D4E] hover:bg-[#E8E4DB]">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {isWaitingApproval && (
        <Card className="border-[#49B1E4] bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#49B1E4] flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#3D3D4E] mb-1">{t.awaitingApproval}</h3>
                <p className="text-sm text-gray-600">{t.approvalMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.basicInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {onUpdateProfile && !isWaitingApproval && (
            <div className="flex flex-col gap-3 border-b border-[#E8E4DB] pb-4 sm:flex-row sm:items-center">
              <UserAvatarImage
                avatarPath={editedUser.avatarPath ?? user.avatarPath}
                name={user.name}
                className="h-20 w-20"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setCropOpen(true)}>
                {t.changePhoto}
              </Button>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600 text-sm mb-1">{t.email}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>
            <div>
              <Label className="text-gray-600 text-sm mb-1">{t.name}</Label>
              {isEditing ? (
                <Input value={editedUser.name} onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })} />
              ) : (
                <p className="text-gray-900 mt-1">{user.name}</p>
              )}
            </div>
            <div>
              <Label className="text-gray-600 text-sm mb-1">{t.furigana}</Label>
              {isEditing ? (
                <Input
                  value={editedUser.furigana}
                  onChange={(e) => {
                    const v = isComposingRef.current
                      ? e.target.value
                      : e.target.value.replace(/[\u3041-\u3096]/g, (m) => String.fromCharCode(m.charCodeAt(0) + 0x60));
                    setEditedUser({ ...editedUser, furigana: v });
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    isComposingRef.current = false;
                    setEditedUser({
                      ...editedUser,
                      furigana: e.currentTarget.value.replace(/[\u3041-\u3096]/g, (m) =>
                        String.fromCharCode(m.charCodeAt(0) + 0x60)
                      ),
                    });
                  }}
                />
              ) : (
                <p className="text-gray-900 mt-1">{user.furigana}</p>
              )}
            </div>
            <div>
              <Label className="text-gray-600 text-sm mb-1">{t.category}</Label>
              <div className="mt-1">
                <Badge className={`${getCategoryColor(user.category)}`}>{getCategoryLabel(user.category)}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.academicInfo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {user.major && (
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.major}</Label>
                {isEditing ? (
                  <Input value={editedUser.major} onChange={(e) => setEditedUser({ ...editedUser, major: e.target.value })} />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{user.major}</p>
                  </div>
                )}
              </div>
            )}
            {user.studentNumber && (
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.studentNumber}</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.studentNumber}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
                        .toUpperCase();
                      setEditedUser({ ...editedUser, studentNumber: value });
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <IdCard className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{user.studentNumber}</p>
                  </div>
                )}
              </div>
            )}
            {user.grade && (
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.grade}</Label>
                {isEditing ? (
                  <Input value={editedUser.grade} onChange={(e) => setEditedUser({ ...editedUser, grade: e.target.value })} />
                ) : (
                  <p className="text-gray-900 mt-1">{user.grade}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isWaitingApproval && (
        <Card>
          <CardHeader>
            <CardTitle>{t.personalInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.nickname}</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.nickname || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, nickname: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{user.nickname || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.birthday}</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedUser.birthday || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, birthday: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 mt-1">{user.birthday || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.birthCountry}</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.birthCountry || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, birthCountry: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{user.birthCountry || '-'}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.languages}</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.languages?.join(', ') || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, languages: e.target.value.split(',').map((s) => s.trim()) })}
                  />
                ) : (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {user.languages && user.languages.length > 0 ? (
                      user.languages.map((lang, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <Globe2 className="w-3 h-3" />
                          {lang}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-900">-</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.phone}</Label>
                {isEditing ? (
                  <Input value={editedUser.phone || ''} onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })} />
                ) : user.phone ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{user.phone}</p>
                  </div>
                ) : (
                  <p className="text-gray-900 mt-1">-</p>
                )}
              </div>
              <div>
                <Label className="text-gray-600 text-sm mb-1">{t.organizations}</Label>
                {isEditing ? (
                  <Input
                    value={editedUser.organizations || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, organizations: e.target.value })}
                  />
                ) : user.organizations ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{user.organizations}</p>
                  </div>
                ) : (
                  <p className="text-gray-900 mt-1">-</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
