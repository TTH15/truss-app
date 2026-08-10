-- =============================================
-- Truss App - 公開文書の保護と改定履歴
-- =============================================
-- 目的（041 の site_documents の拡張）:
-- 1. 保護文書（利用規約・プライバシーポリシー等の法的文書）は上位役職
--    （代表・副代表・顧問）のみが改定できるようにする。
--    将来 Web サイトの CMS を兼ねたとき、一般の運営が触ってよい文書と
--    勝手に変更してはまずい文書を分けるための仕組み。
-- 2. 保存のたびに旧内容を自動で履歴に退避し、「誰が・いつ・何を変えたか」を
--    追跡できるようにする（誤改定からの巻き戻しにも使う）。

-- ---------------------------------------------
-- 1. 保護フラグと上位役職の判定
-- ---------------------------------------------

ALTER TABLE public.site_documents
  ADD COLUMN IF NOT EXISTS protected BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.site_documents.protected IS
  '保護文書。TRUE の行は上位役職（president / vice_president / advisor）のみ編集可能';

-- 上位役職の判定（is_admin_safe と同じく SECURITY DEFINER で RLS の再帰を回避）。
-- 注意: 役職ベースの判定のため、役職を持たない旧・専用運営アカウント（Truss Admin 等）は
-- 対象外。保護文書の改定は役職付きの個人アカウントで行うこと。
CREATE OR REPLACE FUNCTION public.is_senior_admin_safe()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(v_role IN ('president', 'vice_president', 'advisor'), FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 書き込みポリシーを保護対応版に差し替え
-- INSERT: WITH CHECK が NEW 行を検査するため、一般運営は protected=TRUE の行を作れない
DROP POLICY IF EXISTS site_documents_insert_admin ON public.site_documents;
CREATE POLICY site_documents_insert_admin
ON public.site_documents FOR INSERT
WITH CHECK (
  is_admin_safe() AND (NOT protected OR is_senior_admin_safe())
);

-- UPDATE: USING が現在行（保護文書は上位役職のみ触れる）、
--         WITH CHECK が更新後の行（一般運営が protected を立てて封鎖することも防ぐ）
DROP POLICY IF EXISTS site_documents_update_admin ON public.site_documents;
CREATE POLICY site_documents_update_admin
ON public.site_documents FOR UPDATE
USING (
  is_admin_safe() AND (NOT protected OR is_senior_admin_safe())
)
WITH CHECK (
  is_admin_safe() AND (NOT protected OR is_senior_admin_safe())
);

-- 規約・ポリシーの行を保護付きで先に作っておく。
-- （行を後から作る運用だと、一般運営が先に無保護の行を作って乗っ取れてしまう）
-- content は空 = アプリは内蔵の既定文面で表示し続ける。初回の保存で実文面が入る。
INSERT INTO public.site_documents (id, content, protected)
VALUES
  ('privacy-policy', '', TRUE),
  ('terms-of-service', '', TRUE)
ON CONFLICT (id) DO UPDATE SET protected = TRUE;

-- ---------------------------------------------
-- 2. 改定履歴（保存時に旧内容を自動退避）
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_document_revisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES site_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  -- 退避した版のメタ情報（その版がいつ・誰によって保存されたものか）
  saved_at TIMESTAMPTZ NOT NULL,
  saved_by UUID,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_document_revisions_document
  ON public.site_document_revisions(document_id, archived_at DESC);

COMMENT ON TABLE public.site_document_revisions IS
  '公開文書の改定履歴。site_documents の UPDATE 時にトリガーで旧内容を自動退避（巻き戻し・監査用）';

ALTER TABLE public.site_document_revisions ENABLE ROW LEVEL SECURITY;

-- 履歴の閲覧は運営のみ（編集・削除のポリシーは作らない = トリガー経由でのみ書き込まれる）
DROP POLICY IF EXISTS site_document_revisions_select_admin ON public.site_document_revisions;
CREATE POLICY site_document_revisions_select_admin
ON public.site_document_revisions FOR SELECT
USING (is_admin_safe());

-- SECURITY DEFINER: 更新者自身には revisions への INSERT 権限が無いため、定義者権限で退避する
CREATE OR REPLACE FUNCTION public.archive_site_document_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 内容が実際に変わった時だけ退避。空（041/042 のシード行）は履歴にしない
  IF NEW.content IS DISTINCT FROM OLD.content AND OLD.content <> '' THEN
    INSERT INTO public.site_document_revisions (document_id, content, saved_at, saved_by)
    VALUES (OLD.id, OLD.content, OLD.updated_at, OLD.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_documents_archive_revision ON public.site_documents;
CREATE TRIGGER site_documents_archive_revision
  BEFORE UPDATE ON public.site_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_site_document_revision();
