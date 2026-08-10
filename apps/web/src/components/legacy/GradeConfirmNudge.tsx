"use client";

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Language, User } from '@truss/core';
import { currentAcademicYear } from '@truss/core';

/** users.grade の値 → 表示ラベル（InitialRegistration の選択肢と同じ体系） */
const GRADE_OPTIONS: Array<{ value: string; ja: string; en: string }> = [
  { value: '1', ja: 'B1 (学部1年)', en: 'B1 (1st Year)' },
  { value: '2', ja: 'B2 (学部2年)', en: 'B2 (2nd Year)' },
  { value: '3', ja: 'B3 (学部3年)', en: 'B3 (3rd Year)' },
  { value: '4', ja: 'B4 (学部4年)', en: 'B4 (4th Year)' },
  { value: 'M1', ja: 'M1 (修士1年)', en: 'M1 (Master 1st Year)' },
  { value: 'M2', ja: 'M2 (修士2年)', en: 'M2 (Master 2nd Year)' },
  { value: 'D1', ja: 'D1 (博士1年)', en: 'D1 (Doctoral 1st Year)' },
  { value: 'D2', ja: 'D2 (博士2年)', en: 'D2 (Doctoral 2nd Year)' },
  { value: 'D3', ja: 'D3 (博士3年)', en: 'D3 (Doctoral 3rd Year)' },
  { value: 'other', ja: 'その他', en: 'Other' },
];

const gradeLabel = (value: string | undefined, language: Language) => {
  const option = GRADE_OPTIONS.find((o) => o.value === value);
  return option ? option[language] : value || '-';
};

interface GradeConfirmNudgeProps {
  language: Language;
  user: User;
  onUpdateProfile: (updates: Partial<User>) => Promise<{ error: Error | null }>;
}

/**
 * 年度ごとの学年確認ナッジ。
 * grade_confirmed_for が現在年度より古い（または未設定の）会員に表示し、
 * 「合っています」または学年の選び直しで現在年度を記録して消える。
 * 閉じるボタンは置かない（確認するまで残す。1タップで消えるので負担は小さい）
 */
export function GradeConfirmNudge({ language, user, onUpdateProfile }: GradeConfirmNudgeProps) {
  const academicYear = currentAcademicYear();
  const [editing, setEditing] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(user.grade ?? '');
  const [saving, setSaving] = useState(false);

  const needsConfirmation =
    user.approved && !!user.grade?.trim() && (user.gradeConfirmedFor ?? 0) < academicYear;
  if (!needsConfirmation) return null;

  const save = async (updates: Partial<User>, successMessage: string) => {
    setSaving(true);
    const { error } = await onUpdateProfile({ ...updates, gradeConfirmedFor: academicYear });
    setSaving(false);
    if (error) {
      toast.error(language === 'ja' ? '保存に失敗しました' : 'Failed to save');
      return;
    }
    toast.success(successMessage);
  };

  return (
    <div className="bg-white border border-[#49B1E4]/40 p-4 rounded-xl mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-[#E0F3FB] rounded-full flex items-center justify-center shrink-0">
          <FontAwesomeIcon icon={faGraduationCap} className="w-5 h-5 text-[#49B1E4]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#3D3D4E]">
            {language === 'ja' ? '学年の確認' : 'Confirm Your Grade'}
          </h4>
          <p className="text-sm text-[#4A5565] mt-1">
            {language === 'ja'
              ? `登録されている学年は「${gradeLabel(user.grade, language)}」です。現在の学年と合っていますか？`
              : `Your registered grade is "${gradeLabel(user.grade, language)}". Is this still correct?`}
          </p>
          {editing ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-48 bg-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={saving || !selectedGrade}
                className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9"
                onClick={() =>
                  void save(
                    { grade: selectedGrade },
                    language === 'ja' ? '学年を更新しました' : 'Grade updated'
                  )
                }
              >
                {language === 'ja' ? '保存する' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" className="h-9" disabled={saving} onClick={() => setEditing(false)}>
                {language === 'ja' ? 'キャンセル' : 'Cancel'}
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={saving}
                className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white h-9"
                onClick={() =>
                  void save({}, language === 'ja' ? 'ご確認ありがとうございました' : 'Thanks for confirming!')
                }
              >
                {language === 'ja' ? '合っています' : "Yes, it's correct"}
              </Button>
              <Button size="sm" variant="outline" className="h-9" disabled={saving} onClick={() => setEditing(true)}>
                {language === 'ja' ? '変更する' : 'Change'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
