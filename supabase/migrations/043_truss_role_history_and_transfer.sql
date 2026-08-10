-- =============================================
-- Truss App - 役職の在任履歴と引き継ぎ
-- =============================================
-- 目的:
-- 1. 「過去に総務メンバー（役職者）だった」事実を在任期間つきで DB に残す。
--    今後の役職変更はトリガーで自動記録し、過去分は運営画面から手動登録する。
-- 2. 代表・副代表は同時に1人しか存在できないことを DB で強制し、
--    引き継ぎ（前任の降格 + 後任の昇格）を1トランザクションで行う関数を提供する。
--
-- ⚠️ 適用前の確認: 代表・副代表が既に2人以上いるとユニークインデックス作成で失敗する。
--   SELECT role, COUNT(*) FROM users WHERE role IN ('president','vice_president')
--     AND withdrawn_at IS NULL GROUP BY role HAVING COUNT(*) > 1;
--   が0件であることを確認してから適用する。

-- ---------------------------------------------
-- 1. 在任履歴
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_role_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 記録するのは役職のみ。部員/非会員は会費連動で頻繁に切り替わるため記録しない
  role TEXT NOT NULL CHECK (role IN ('officer', 'vice_president', 'president', 'advisor')),
  started_on DATE NOT NULL,
  ended_on DATE,  -- NULL = 在任中
  note TEXT,      -- 手動登録時の補足（「2024年度」等）
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_history_user
  ON public.user_role_history(user_id, started_on DESC);

COMMENT ON TABLE public.user_role_history IS
  '役職の在任履歴。source=auto は users.role の変更をトリガーが自動記録したもの、manual は運営画面からの手動登録';

ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;

-- 履歴の閲覧・手動登録・修正（削除）は運営のみ
DROP POLICY IF EXISTS user_role_history_select_admin ON public.user_role_history;
CREATE POLICY user_role_history_select_admin
ON public.user_role_history FOR SELECT
USING (is_admin_safe());

DROP POLICY IF EXISTS user_role_history_insert_admin ON public.user_role_history;
CREATE POLICY user_role_history_insert_admin
ON public.user_role_history FOR INSERT
WITH CHECK (is_admin_safe());

DROP POLICY IF EXISTS user_role_history_delete_admin ON public.user_role_history;
CREATE POLICY user_role_history_delete_admin
ON public.user_role_history FOR DELETE
USING (is_admin_safe());

-- users.role の変更を自動記録する（SECURITY DEFINER: 更新者の RLS に依存せず履歴を書く）
CREATE OR REPLACE FUNCTION public.record_role_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 旧役職の在任期間を閉じる
    IF OLD.role IN ('officer', 'vice_president', 'president', 'advisor') THEN
      UPDATE public.user_role_history
      SET ended_on = CURRENT_DATE
      WHERE user_id = OLD.id AND role = OLD.role AND ended_on IS NULL;
    END IF;
    -- 新役職の在任期間を開く
    IF NEW.role IN ('officer', 'vice_president', 'president', 'advisor') THEN
      INSERT INTO public.user_role_history (user_id, role, started_on, source)
      VALUES (NEW.id, NEW.role, CURRENT_DATE, 'auto');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_record_role_history ON public.users;
CREATE TRIGGER users_record_role_history
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.record_role_history();

-- ---------------------------------------------
-- 2. 代表・副代表の1人制約と引き継ぎ関数
-- ---------------------------------------------

-- 退会者は除外（退会後も role 列は残るため）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_single_president
  ON public.users(role) WHERE role = 'president' AND withdrawn_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_single_vice_president
  ON public.users(role) WHERE role = 'vice_president' AND withdrawn_at IS NULL;

-- 引き継ぎ: 前任の降格 → 後任の昇格 を1トランザクションで行う。
-- SECURITY DEFINER だが、呼び出し元の運営権限を必ず検査する。
-- users への UPDATE は既存トリガー（032 の権限ガード / 039 の is_admin 連動 / 上の履歴記録）を通る。
CREATE OR REPLACE FUNCTION public.transfer_role(
  p_successor UUID,
  p_role TEXT,
  p_predecessor_new_role TEXT DEFAULT 'member'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_predecessor UUID;
BEGIN
  IF NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Only admins can transfer roles';
  END IF;
  IF p_role NOT IN ('president', 'vice_president') THEN
    RAISE EXCEPTION 'transfer_role supports president / vice_president only';
  END IF;
  IF p_predecessor_new_role NOT IN ('member', 'officer') THEN
    RAISE EXCEPTION 'predecessor new role must be member or officer';
  END IF;

  SELECT id INTO v_predecessor
  FROM users
  WHERE role = p_role AND withdrawn_at IS NULL AND id <> p_successor
  LIMIT 1;

  -- 前任を先に降格しないと1人制約に当たる
  IF v_predecessor IS NOT NULL THEN
    UPDATE users SET role = p_predecessor_new_role WHERE id = v_predecessor;
  END IF;

  UPDATE users SET role = p_role WHERE id = p_successor AND role IS DISTINCT FROM p_role;
END;
$$;
