-- Preserve the currently displayed defaults without inventing their publication date.
ALTER TABLE public.site_documents ADD COLUMN is_initial_version boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_document_revisions ADD COLUMN is_initial_version boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_document_revisions ALTER COLUMN saved_at DROP NOT NULL;

UPDATE public.site_documents SET content = $initial$神戸大学留学生支援サークル Truss（以下「当団体」）は、当団体が提供する「Truss公式アプリ（以下「本サービス」）」において取得する個人情報の取扱いについて、以下のとおりプライバシーポリシー（個人情報保護方針）を定めます。

本サービスの利用者は、本ポリシーに同意のうえ、本サービスを利用するものとします。

1. 個人情報取扱事業者（当団体）
名称：神戸大学留学生支援サークル Truss

2. 当団体が取得する情報
当団体は、本サービスの提供にあたり、主に以下の情報を取得します。

(1) 登録情報（利用者から直接取得）
・氏名、ふりがな
・学籍番号（学番）、学部・学科（専攻）、学年
・カテゴリ（日本人学生・国内学生／正規留学生／交換留学生）
・電話番号（必須）
・所属団体／その他（任意）
・出生国（入力された場合）
・話せる言語（入力された場合）
・その他当団体が本サービス上の手続きに必要と定める情報

(2) 認証関連情報（Googleログイン等）
・Googleアカウントに紐づく識別子、メールアドレス等（当団体が本サービスの認証・アカウント作成・連絡に必要な範囲）

(3) 学生証画像（本人確認・所属確認のため）
・当団体が指定する本人確認・所属確認のための学生証画像（学生証写真）

(4) 利用状況情報
・アクセスログ、操作履歴、エラー情報、IPアドレス等（不正防止、運用改善、セキュリティ維持のため）

(5) 住所等（正規留学生：住所提出が必須）
・当団体は、正規留学生（regular-international）に該当する利用者に対し、当団体の運用上必要な申請手続きに限り住所等の追加情報の提出を必須とします。
・住所等は、当該手続きの目的達成に必要な最小限の期間に限り保管し、目的達成後に速やかに削除します。

3. 個人情報の利用目的
当団体は、取得した個人情報を、以下の目的で利用します。
1) 本サービスの提供（メンバー管理、イベント管理、掲示板・連絡、通知等）
2) 利用者の本人確認・所属確認（学生証画像の確認を含みます）
3) 運営上の連絡・問い合わせ対応
4) 不正利用の防止、セキュリティ確保、障害対応
5) 本サービスの改善（エラーの分析、運用状況の把握等）

4. 学生証画像の取扱い（保存期間・削除）
・学生証画像は、本人確認・所属確認のためにのみ利用します。
・当団体は、認証（当団体による承認）後、学生証画像の保管が不要となり次第、遅くとも「承認完了後1週間以内」を目安として削除します。
・当該画像は、第三者に対し、法令に基づく場合を除き、提供しません。

5. 住所等の取扱い（保存期間・最小化）
・当団体は、正規留学生（regular-international）に該当する利用者について、当該手続きに必要な住所等の追加情報を取得します。
・住所等は、当該手続きの目的達成に必要な最小限の期間に限り保管し、提出完了後に速やかに削除します。
・保存が法令により必要となる場合には、法令に基づく範囲でのみ保管します。

6. 第三者提供
当団体は、法令に基づく場合、または利用者本人の同意がある場合を除き、個人情報を第三者に提供しません。

7. 委託（外部サービスの利用）
当団体は、本サービスの運用のために、以下の外部サービスを利用する場合があります。
・Supabase（データベース／認証／ストレージ等）
・Google（ログイン認証等）

当団体は、外部サービスを利用する場合、利用者の個人情報の安全管理が図られるよう、合理的な監督を行います。

8. 国外への移転（保存・処理）
本サービスでは、クラウドサービス（Supabase等）を利用するため、利用者の個人情報がサーバーの所在国・地域によって、日本国外で保存または処理される可能性があります。
当団体は、保存・処理にあたり、合理的な安全管理措置が確保されるよう努めます。

9. 安全管理措置
当団体は、個人情報の漏えい、滅失、毀損、不正アクセス等のリスクに対して、合理的な安全管理措置を講じます。
・アクセス権限の管理（当団体の管理者・運営関係者に限定）
・認証情報および権限管理
・保存期間の見直し（学生証画像や住所等の削除を含みます）
・運用上必要な範囲でのログ管理

ただし、インターネットを介した通信およびシステムの完全な安全を保証することはできません。

10. 利用者の権利（開示・訂正・削除等）
利用者は、当団体所定の方法により、自己の個人情報について開示・訂正・削除・利用停止等を求めることができます。
もっとも、法令に基づく保存義務、紛争対応、不正防止等のために、直ちに全ての削除等に応じられない場合があります。

11. 退会・データ削除
利用者が本サービスを退会した場合、当団体は、運用上必要な範囲で一定期間データを保持し、その後、合理的な方法で削除します。
また、学生証画像については、承認・認証手続きに応じて、遅くとも「承認完了後1週間以内」を目安として削除します。
なお、法令上の義務や紛争対応等のために必要な範囲では、保持することがあります。

12. 本ポリシーの変更
当団体は、本ポリシーを変更することがあります。
重要な変更は、本サービス上の告知その他当団体が適切と判断する方法で周知します。
変更後に利用者が本サービスを利用した場合、変更後の内容に同意したものとみなします。

13. お問い合わせ窓口
窓口：神戸大学留学生支援サークル Truss（総務）
メール：truss.kobe@gmail.com
※お問い合わせの際は、本人確認が必要となる場合があります。
$initial$, is_initial_version = true WHERE id = 'privacy-policy' AND btrim(content) = '';

UPDATE public.site_documents SET content = $initial$神戸大学留学生支援サークル Truss（以下「当団体」）は、当団体が提供する「Truss公式アプリ（以下「本サービス」）」について、以下のとおり利用規約（以下「本規約」）を定めます。

本サービスの利用にあたっては、利用者は本規約および当団体のプライバシーポリシーに同意する必要があります。

第1条（適用）
1. 本規約は、本サービスの利用に関する当団体と利用者との間の一切の関係に適用されます。
2. 当団体が本サービス上で別途定めるガイドライン、運用ルール等（以下「関連ルール」）は、本規約の一部を構成します。

第2条（利用対象・利用条件）
1. 本サービスは、当団体が定める内部限定の運用により、当団体の構成員および当団体が定める利用対象者のみが利用できます。
2. 利用者は、当団体が求める登録情報を正確かつ最新の内容で提供するものとします。
3. 当団体は、利用者が本規約または関連ルールに違反した場合、登録抹消・利用停止等の措置を行うことがあります。

第3条（アカウント登録・認証）
1. 本サービスの利用には、Googleアカウントによるログイン（OAuth等）を用いたアカウント登録が必要です。
2. 本サービスでは、本人確認・所属確認等のため、利用者に対して必要な情報の提出を求める場合があります（例：学生証画像、電話番号）。
3. 学生証画像は、認証（当団体による承認）に必要な範囲でのみ利用します。
4. 当団体は、運用・連絡等のため、利用者の電話番号を登録情報として利用することがあります。
5. 学生証画像は、認証完了後、遅くとも「承認完了後1週間以内」を目安として削除します。
6. 当団体は、正規留学生（regular-international）に該当する利用者に対し、当団体の運用上必要な申請手続きのため、住所等の追加情報の提出を必須とします。住所等は、当該手続きの目的達成に必要な最小限の期間に限り保管し、目的達成後に速やかに削除します。
7. 当団体は、利用者が提出した情報の真実性または正確性を審査することがあります。
8. 利用者が未成年である場合には、法定代理人の同意その他法令上必要な手続を行ったうえで利用するものとします。

第4条（本サービスの内容）
本サービスは、当団体の活動支援を目的として、利用者間の連絡、イベント管理、掲示板（投稿）、メンバー管理等の機能を提供します。
本サービスは、データの保存・管理のためにSupabase等のクラウドサービスを利用して運用されます。
利用者は、本サービスが内部限定の運用であることを理解し、当団体の運用目的に従って利用するものとします。

第5条（投稿・表示等）
1. 利用者は、掲示板、連絡機能、投稿機能等に投稿する内容について、自己の責任において行うものとします。
2. 当団体は、以下に該当し、または該当するおそれがあると判断した投稿等について、事前通知なく、削除、非表示、利用停止、修正依頼その他の措置を行うことがあります。
・法令または公序良俗に反するもの
・特定の個人または団体に対する誹謗中傷、差別、嫌がらせ等
・本人の同意なく個人情報（住所、連絡先等）を不必要に公開するもの
・なりすまし、虚偽情報の流布
・当団体の活動趣旨と無関係な商用宣伝・勧誘
・その他当団体が不適切と判断するもの
3. 投稿の公開範囲は、原則として当団体が定める利用対象者に限定されます。ただし、技術的または運用上の事情により完全な秘匿性を保証するものではありません（第10条の免責を参照）。

第6条（禁止事項）
利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
1. 虚偽の登録、他人の情報の登録、なりすまし
2. 不正アクセス、脆弱性の探索、リバースエンジニアリング等、本サービスの不正利用
3. 本サービスの運用を妨害する行為
4. 他の利用者または第三者の権利（著作権、肖像権、プライバシー等）を侵害する行為
5. 法令または公序良俗に反する行為
6. 当団体または第三者に不利益または損害を与える行為
7. その他当団体が不適切と判断する行為

第7条（利用停止・登録抹消）
当団体は、利用者が以下のいずれかに該当すると判断した場合、事前通知なく、利用停止・投稿削除・登録抹消等の措置を行うことがあります。
1. 本規約または関連ルールに違反した場合
2. 登録情報に虚偽がある場合
3. 利用資格を満たさなくなった場合（当団体が定める利用対象者から外れた場合等）
4. その他当団体が運用上不適切と判断した場合

第8条（サービスの変更・停止・終了）
1. 当団体は、運用上の都合により、本サービスの内容を変更し、または提供を停止・終了することがあります。
2. 当団体は、可能な範囲で事前に告知するよう努めますが、緊急の場合はこの限りではありません。

第9条（知的財産権）
1. 本サービスに関するプログラム、デザイン、文章、画像、音声、商標等に関する権利は、当団体または正当な権利者に帰属します。
2. 利用者は、当団体または正当な権利者の事前の承諾なく、これらを複製、改変、転載、配布、販売等してはなりません。

第10条（免責）
1. 当団体は、本サービスの正確性、完全性、継続性、特定目的への適合性等について、明示または黙示を問わず保証しません。
2. 利用者が本サービスを利用または利用できなかったことにより生じた損害について、当団体に故意または重過失がある場合を除き、当団体は責任を負いません。
3. 本サービスは当団体の活動支援を目的とする内部限定ツールであり、本サービス上の情報や投稿内容等について、当団体はその妥当性、適法性、目的適合性、真実性等を保証しません。
4. 利用者間または第三者との紛争が生じた場合、利用者は自己の責任と費用で解決するものとし、当団体は当該紛争に関して責任を負いません。

第11条（規約の変更）
1. 当団体は、本規約を変更することがあります。
2. 当団体は、重要な変更について、本サービス上の告知等、適切と判断する方法で周知します。
3. 変更後に利用者が本サービスを利用した場合、変更後の規約に同意したものとみなします。

第12条（準拠法・管轄）
1. 本規約は日本法に準拠します。
2. 本サービスに関して紛争が生じた場合、神戸地方裁判所または神戸簡易裁判所を第一審の専属的合意管轄裁判所とします。

第13条（問い合わせ窓口）
本サービスに関する問い合わせは、以下までご連絡ください。
・窓口：神戸大学留学生支援サークル Truss（総務）
・メール：truss.kobe@gmail.com
$initial$, is_initial_version = true WHERE id = 'terms-of-service' AND btrim(content) = '';

ALTER TABLE public.site_documents ADD CONSTRAINT site_documents_legal_content_nonempty
  CHECK (id NOT IN ('terms-of-service','privacy-policy') OR btrim(content) <> '');

-- Private audit history never becomes publicly readable. Only selected snapshots do.
CREATE TABLE public.site_document_published_revisions (
  revision_id bigint PRIMARY KEY REFERENCES public.site_document_revisions(id) ON DELETE CASCADE,
  document_id text NOT NULL REFERENCES public.site_documents(id) ON DELETE CASCADE
    CHECK (document_id IN ('terms-of-service','privacy-policy')),
  content text NOT NULL CHECK (btrim(content) <> ''),
  saved_at timestamptz,
  is_initial_version boolean NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_document_published_revisions_document_idx ON public.site_document_published_revisions(document_id,revision_id DESC);
ALTER TABLE public.site_document_published_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_document_published_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_document_published_revisions TO anon, authenticated;
GRANT ALL ON public.site_document_published_revisions TO service_role;
CREATE POLICY site_document_published_revisions_read ON public.site_document_published_revisions
  FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON public.site_document_revisions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_document_revisions TO authenticated;
GRANT ALL ON public.site_document_revisions TO service_role;
REVOKE ALL ON SEQUENCE public.site_document_revisions_id_seq FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION private.archive_site_document_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO actor FROM public.users WHERE auth_id=auth.uid() AND is_admin AND withdrawn_at IS NULL;
    IF actor IS NULL THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  ELSIF coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'role' IN ('anon','authenticated') THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';
  END IF;
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    IF btrim(OLD.content) <> '' THEN
      INSERT INTO public.site_document_revisions(document_id,content,saved_at,saved_by,is_initial_version)
        VALUES(OLD.id,OLD.content,CASE WHEN OLD.is_initial_version THEN NULL ELSE OLD.updated_at END,OLD.updated_by,OLD.is_initial_version);
    END IF;
    NEW.updated_at := clock_timestamp();
    NEW.updated_by := actor;
    NEW.is_initial_version := false;
  ELSE
    NEW.updated_at := OLD.updated_at;
    NEW.updated_by := OLD.updated_by;
    NEW.is_initial_version := OLD.is_initial_version;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.archive_site_document_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER site_documents_archive_revision ON public.site_documents;
DROP FUNCTION public.archive_site_document_revision();
CREATE TRIGGER site_documents_archive_revision BEFORE UPDATE ON public.site_documents
  FOR EACH ROW EXECUTE FUNCTION private.archive_site_document_revision();

CREATE FUNCTION private.set_site_document_revision_published(p_revision_id bigint,p_published boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE revision public.site_document_revisions%ROWTYPE; protected_document boolean; staff_role text;
BEGIN
  SELECT role INTO staff_role FROM public.users
    WHERE auth_id=auth.uid() AND is_admin AND withdrawn_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  SELECT * INTO revision FROM public.site_document_revisions WHERE id=p_revision_id FOR UPDATE;
  IF NOT FOUND OR revision.document_id NOT IN ('terms-of-service','privacy-policy') THEN
    RAISE EXCEPTION 'Revision not found' USING ERRCODE='22023';
  END IF;
  SELECT protected INTO protected_document FROM public.site_documents WHERE id=revision.document_id FOR SHARE;
  IF protected_document AND coalesce(staff_role,'') NOT IN ('president','vice_president','advisor','se') THEN
    RAISE EXCEPTION 'Senior role required' USING ERRCODE='42501';
  END IF;
  IF p_published IS NULL THEN RAISE EXCEPTION 'Publication state required' USING ERRCODE='22023'; END IF;
  IF p_published THEN
    INSERT INTO public.site_document_published_revisions(revision_id,document_id,content,saved_at,is_initial_version)
      VALUES(revision.id,revision.document_id,revision.content,revision.saved_at,revision.is_initial_version)
      ON CONFLICT (revision_id) DO NOTHING;
  ELSE
    DELETE FROM public.site_document_published_revisions WHERE revision_id=revision.id;
  END IF;
  RETURN p_published;
END;
$$;
REVOKE ALL ON FUNCTION private.set_site_document_revision_published(bigint,boolean) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.set_site_document_revision_published(bigint,boolean) TO authenticated;
CREATE FUNCTION public.set_site_document_revision_published(p_revision_id bigint,p_published boolean)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT private.set_site_document_revision_published(p_revision_id,p_published);
$$;
REVOKE ALL ON FUNCTION public.set_site_document_revision_published(bigint,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_site_document_revision_published(bigint,boolean) TO authenticated;
