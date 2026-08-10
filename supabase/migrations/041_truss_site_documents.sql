-- =============================================
-- Truss App - 規約・ポリシー文書の CMS 化
-- =============================================
-- 目的:
-- - 利用規約 / プライバシーポリシーを運営画面から閲覧・改定できるようにする
--   （連絡先メールアドレスは年度ごとに変わるため、コード変更なしで直せる必要がある）。
--
-- 設計:
-- - 1文書 = 1行（id はアプリ側で 'privacy-policy' / 'terms-of-service' を使用）。
-- - DB に行が無い間は、アプリに埋め込まれた既定の文面が表示される（フォールバック）。
--   運営画面で初めて保存したときに行が作られる。
-- - 公開ページはログイン前に表示する必要があるため、SELECT は匿名を含む全員に許可。

CREATE TABLE IF NOT EXISTS public.site_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.site_documents IS
  '規約・ポリシー等の公開文書（運営画面から編集）。行が無い文書はアプリ内蔵の既定文面で表示される';

ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY;

-- 規約はログイン前のユーザーにも見せるため、読み取りは全員（匿名含む）
DROP POLICY IF EXISTS site_documents_select_all ON public.site_documents;
CREATE POLICY site_documents_select_all
ON public.site_documents FOR SELECT
USING (true);

-- 改定は運営のみ
DROP POLICY IF EXISTS site_documents_insert_admin ON public.site_documents;
CREATE POLICY site_documents_insert_admin
ON public.site_documents FOR INSERT
WITH CHECK (is_admin_safe());

DROP POLICY IF EXISTS site_documents_update_admin ON public.site_documents;
CREATE POLICY site_documents_update_admin
ON public.site_documents FOR UPDATE
USING (is_admin_safe())
WITH CHECK (is_admin_safe());
