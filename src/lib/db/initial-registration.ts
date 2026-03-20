/**
 * 初期登録フロー用の users 行（Insert / Update）を組み立てる
 */
import type { DbUserInsert, DbUserUpdate } from "../../types/database.types";

export type InitialRegistrationPayload = {
  name: string;
  furigana: string;
  studentNumber: string;
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
    grade: data.grade,
    major: data.major,
    registration_step: "waiting_approval",
    email_verified: true,
    initial_registered: true,
    profile_completed: false,
    fee_paid: false,
    requested_at: requestedAt,
  };
}

/** 新規 users 行（初回 insert） */
export function buildInitialRegistrationUserInsert(
  authId: string,
  email: string,
  data: InitialRegistrationPayload,
  requestedAt: string
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
    grade: base.grade ?? null,
    major: base.major ?? null,
    phone: null,
    organizations: null,
    blocked: false,
    registration_step: base.registration_step!,
    email_verified: base.email_verified!,
    initial_registered: base.initial_registered!,
    profile_completed: base.profile_completed!,
    fee_paid: base.fee_paid!,
    membership_year: null,
    is_renewal: false,
    student_id_reupload_requested: false,
    reupload_reason: null,
    requested_at: base.requested_at ?? null,
  };
}
