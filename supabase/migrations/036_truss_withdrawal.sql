-- =============================================
-- Truss App - 退会（ユーザー自身によるアカウント削除）
-- =============================================
-- 背景:
-- - 年会費のリマインドが続くと「面倒だからアカウントごと消す」人が出る想定。
-- - ただし users 行を物理削除すると、同じ人が別の（あるいは同じ）Google アカウントで
--   作り直すことで未払いのままイベントに参加できてしまう。
--
-- 方針（個人情報は消し、判定に必要な最小限だけ残す）:
-- - `users` 行は物理削除せず、個人情報を消して「退会済み」にする（投稿や写真が
--   参照を失って壊れないようにするため。表示名は「退会したメンバー」に置き換える）。
-- - 再登録の検知に使うため、学籍番号・会費の支払い状況・会員年度・退会日時は残す。
--   学籍番号は在学中は変わらず本人に固有なので、メールアドレスより確実に同一人物を指せる。

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_withdrawn_student_number
  ON public.users(student_number)
  WHERE withdrawn_at IS NOT NULL;

COMMENT ON COLUMN public.users.withdrawn_at IS
  '退会日時。NULL でなければ退会済み（個人情報は削除済み、学籍番号と会費状況のみ保持）';

/**
 * 退会処理。
 * 本人だけが自分に対して実行できる（SECURITY DEFINER だが呼び出し元を検査する）。
 * 個人情報を消し、再登録の検知に必要な列だけを残す。
 */
CREATE OR REPLACE FUNCTION public.withdraw_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := get_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.users
  SET
    -- 個人情報は消す
    name = '退会したメンバー',
    nickname = '退会したメンバー',
    furigana = '',
    email = 'withdrawn+' || v_user_id::text || '@truss.invalid',
    phone = '',
    birthday = NULL,
    country = '',
    languages = '{}',
    major = NULL,
    grade = NULL,
    organizations = NULL,
    avatar_path = NULL,
    student_id_image = NULL,
    reupload_reason = NULL,
    -- 認証を切り離す（同じ Google アカウントでも新規登録として扱われる）
    auth_id = NULL,
    -- 再開できないようにする
    approved = FALSE,
    blocked = TRUE,
    registration_step = 'email_input',
    withdrawn_at = NOW()
    -- student_number / fee_paid / membership_year / is_renewal / role は
    -- 再登録時の判定に使うため、意図的に残す
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_own_account() TO authenticated;

/**
 * 学籍番号から、退会済みの未払い記録を引く。
 * 初期登録の時点で呼び、該当があれば会費の状態を引き継ぐ（消して作り直しても未払いのまま）。
 * 個人情報は返さない。
 */
CREATE OR REPLACE FUNCTION public.find_withdrawn_record(p_student_number TEXT)
RETURNS TABLE (fee_paid BOOLEAN, membership_year INTEGER, is_renewal BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.fee_paid, u.membership_year, u.is_renewal
  FROM public.users u
  WHERE u.withdrawn_at IS NOT NULL
    AND u.student_number IS NOT NULL
    AND upper(u.student_number) = upper(p_student_number)
  ORDER BY u.withdrawn_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_withdrawn_record(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_withdrawn_record(TEXT) TO authenticated;

-- 退会済みの行は一覧に出さない（運営画面の名簿・承認待ちの両方）
-- 既存ポリシーは users_select_self_or_admin。管理者は履歴確認のため引き続き参照できるが、
-- アプリ側のクエリで withdrawn_at IS NULL を条件に加える。
