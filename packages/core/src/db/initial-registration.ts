/**
 * 初期登録フロー用の users 行（Insert / Update）を組み立てる
 */
import type { DbUserInsert, DbUserUpdate } from "../types/database.types";
import { normalizePhone } from "../phone";
import { currentAcademicYear } from "../student-number";
import type { WithdrawnRecord } from "./mutations/users";

export type InitialRegistrationPayload = {
  name: string;
  furigana: string;
  studentNumber: string;
  phone: string;
  major: string;
  grade: string;
  studentIdImage: string;
  category: "japanese" | "regular-international" | "exchange";
};

/** 既存ユーザー行の更新（承認待ちへ） */
export function buildInitialRegistrationUserUpdate(
  data: InitialRegistrationPayload,
  requestedAt: string
): DbUserUpdate {
  return {
    name: data.name,
    nickname: data.name,
    furigana: data.furigana,
    category: data.category,
    approved: false,
    student_id_image: data.studentIdImage,
    student_number: data.studentNumber,
    phone: normalizePhone(data.phone),
    grade: data.grade,
    // 登録時点の年度で確認済み扱いにする（登録直後に学年確認ナッジを出さない）
    grade_confirmed_for: currentAcademicYear(),
    major: data.major,
    registration_step: "waiting_approval",
    email_verified: true,
    initial_registered: true,
    profile_completed: false,
    fee_paid: false,
    requested_at: requestedAt,
  };
}

/**
 * 新規 users 行（初回 insert）。
 *
 * 退会した人が作り直した場合は `withdrawnRecord` を渡すこと。会費の支払い状況・会員年度・
 * 継続かどうかを引き継ぐ。渡さないと**未払いのまま退会して作り直せば記録が消える**。
 */
export function buildInitialRegistrationUserInsert(
  authId: string,
  email: string,
  data: InitialRegistrationPayload,
  requestedAt: string,
  withdrawnRecord?: WithdrawnRecord | null
): DbUserInsert {
  const base = buildInitialRegistrationUserUpdate(data, requestedAt);
  return {
    auth_id: authId,
    email,
    name: base.name!,
    nickname: base.nickname!,
    furigana: base.furigana!,
    birthday: null,
    languages: [],
    country: "",
    category: base.category!,
    approved: base.approved!,
    is_admin: false,
    student_id_image: base.student_id_image ?? null,
    student_number: base.student_number ?? null,
    phone: base.phone ?? null,
    grade: base.grade ?? null,
    major: base.major ?? null,
    organizations: null,
    blocked: false,
    registration_step: base.registration_step!,
    email_verified: base.email_verified!,
    initial_registered: base.initial_registered!,
    profile_completed: base.profile_completed!,
    fee_paid: withdrawnRecord?.feePaid ?? base.fee_paid!,
    membership_year: withdrawnRecord?.membershipYear ?? null,
    is_renewal: withdrawnRecord?.isRenewal ?? false,
    student_id_reupload_requested: false,
    reupload_reason: null,
    requested_at: base.requested_at ?? null,
  };
}
