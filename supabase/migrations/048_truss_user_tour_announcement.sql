-- ガイドツアーの最後の案内（日英のタイトル・本文・ボタン文言と共通リンク）。
-- 初回保存までは行を作らず、アプリ内の既定文面を表示する。
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_tour_announcement (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title_ja TEXT NOT NULL CHECK (char_length(btrim(title_ja)) BETWEEN 1 AND 120),
  title_en TEXT NOT NULL CHECK (char_length(btrim(title_en)) BETWEEN 1 AND 120),
  description_ja TEXT NOT NULL CHECK (char_length(btrim(description_ja)) BETWEEN 1 AND 1000),
  description_en TEXT NOT NULL CHECK (char_length(btrim(description_en)) BETWEEN 1 AND 1000),
  link_label_ja TEXT NOT NULL CHECK (char_length(btrim(link_label_ja)) BETWEEN 1 AND 80),
  link_label_en TEXT NOT NULL CHECK (char_length(btrim(link_label_en)) BETWEEN 1 AND 80),
  link_url TEXT NOT NULL CHECK (char_length(link_url) <= 2048 AND link_url ~ '^https://[^[:space:]]+$'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_user_tour_announcement_updated_at ON public.user_tour_announcement;
CREATE TRIGGER update_user_tour_announcement_updated_at
  BEFORE UPDATE ON public.user_tour_announcement
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_tour_announcement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tour_announcement_select_authenticated ON public.user_tour_announcement;
CREATE POLICY user_tour_announcement_select_authenticated
  ON public.user_tour_announcement FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS user_tour_announcement_insert_admin ON public.user_tour_announcement;
CREATE POLICY user_tour_announcement_insert_admin
  ON public.user_tour_announcement FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_safe());

DROP POLICY IF EXISTS user_tour_announcement_update_admin ON public.user_tour_announcement;
CREATE POLICY user_tour_announcement_update_admin
  ON public.user_tour_announcement FOR UPDATE TO authenticated
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

GRANT SELECT, INSERT, UPDATE ON public.user_tour_announcement TO authenticated;

COMMIT;
