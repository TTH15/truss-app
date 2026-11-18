-- Development DB only. Apply prerequisites and migration in one rolled-back transaction.
DO $$
DECLARE staff uuid; staff_auth uuid; member uuid; member_auth uuid;
  initial_revision bigint; edited_revision bigint; initial_content text; changed_at timestamptz; published_time timestamptz;
BEGIN
  SELECT id,auth_id INTO STRICT staff,staff_auth FROM public.users WHERE is_admin AND auth_id IS NOT NULL LIMIT 1;
  SELECT id,auth_id INTO STRICT member,member_auth FROM public.users WHERE NOT is_admin AND auth_id IS NOT NULL LIMIT 1;
  UPDATE public.users SET role='president' WHERE id=staff;
  SELECT content INTO initial_content FROM public.site_documents WHERE id='terms-of-service';
  ASSERT initial_content<>'' AND (SELECT is_initial_version FROM public.site_documents WHERE id='terms-of-service'), 'initial public text must be preserved';
  PERFORM set_config('request.jwt.claims',json_build_object('sub',staff_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.site_documents SET content='[検証] 第1版',updated_at='2050-01-01',updated_by=member WHERE id='terms-of-service';
  SELECT id INTO STRICT initial_revision FROM public.site_document_revisions WHERE document_id='terms-of-service';
  ASSERT (SELECT content=initial_content AND is_initial_version AND saved_at IS NULL FROM public.site_document_revisions WHERE id=initial_revision), 'initial version is recorded with no invented date';
  ASSERT (SELECT updated_by=staff AND updated_at<now()+interval '1 minute' AND NOT is_initial_version FROM public.site_documents WHERE id='terms-of-service'), 'author and time come from the server';
  ASSERT (SELECT count(*) FROM public.site_document_published_revisions)=0, 'new history is private by default';
  SELECT updated_at INTO changed_at FROM public.site_documents WHERE id='terms-of-service';
  UPDATE public.site_documents SET content='[検証] 第1版',updated_at='2051-01-01',updated_by=member WHERE id='terms-of-service';
  ASSERT (SELECT count(*) FROM public.site_document_revisions)=1, 'same content does not create a revision';
  ASSERT (SELECT updated_at=changed_at FROM public.site_documents WHERE id='terms-of-service'), 'same content preserves the version date';
  ASSERT public.set_site_document_revision_published(initial_revision,true), 'senior operator may publish';
  SELECT published_at INTO published_time FROM public.site_document_published_revisions WHERE revision_id=initial_revision;
  PERFORM public.set_site_document_revision_published(initial_revision,true);
  ASSERT (SELECT published_at=published_time AND content=initial_content FROM public.site_document_published_revisions WHERE revision_id=initial_revision), 'publish is idempotent and copies exact archived text';
  UPDATE public.site_documents SET content='[検証] 第2版' WHERE id='terms-of-service';
  SELECT id INTO STRICT edited_revision FROM public.site_document_revisions WHERE document_id='terms-of-service' AND NOT is_initial_version;
  ASSERT (SELECT saved_at=changed_at AND saved_by=staff FROM public.site_document_revisions WHERE id=edited_revision), 'old version keeps its genuine date and author';
  ASSERT (SELECT count(*) FROM public.site_document_published_revisions)=1, 'later edits never auto-publish history';
  BEGIN
    UPDATE public.site_document_published_revisions SET content='[検証] 改ざん';
    RAISE EXCEPTION 'direct public snapshot mutation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.site_document_revisions WHERE id=initial_revision;
    RAISE EXCEPTION 'private audit deletion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  UPDATE public.users SET role='officer' WHERE id=staff;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.set_site_document_revision_published(edited_revision,true);
    RAISE EXCEPTION 'non-senior operator published protected document';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  UPDATE public.users SET role='se' WHERE id=staff;
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT public.set_site_document_revision_published(edited_revision,true), 'SE may publish protected history';
  PERFORM public.set_site_document_revision_published(edited_revision,false);
  EXECUTE 'RESET ROLE';
  UPDATE public.users SET withdrawn_at=now() WHERE id=staff;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM public.set_site_document_revision_published(edited_revision,true);
    RAISE EXCEPTION 'withdrawn operator published history';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  UPDATE public.users SET withdrawn_at=NULL,role='president' WHERE id=staff;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',member_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT (SELECT count(*) FROM public.site_document_revisions)=0, 'member cannot read private history';
  ASSERT (SELECT count(*) FROM public.site_document_published_revisions)=1, 'member sees selected version only';
  BEGIN
    PERFORM public.set_site_document_revision_published(edited_revision,true);
    RAISE EXCEPTION 'member published history';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'SET LOCAL ROLE anon';
  ASSERT (SELECT count(*) FROM public.site_document_published_revisions)=1, 'public pages can read selected history before login';
  BEGIN
    PERFORM 1 FROM public.site_document_revisions;
    RAISE EXCEPTION 'anonymous private audit access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_site_document_revision_published(initial_revision,false);
    RAISE EXCEPTION 'anonymous publication mutation';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims',json_build_object('sub',staff_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT NOT public.set_site_document_revision_published(initial_revision,false), 'operator may unpublish';
  ASSERT (SELECT count(*) FROM public.site_document_revisions)=2, 'unpublishing preserves private audit';
  EXECUTE 'SET LOCAL ROLE anon';
  ASSERT NOT EXISTS(SELECT 1 FROM public.site_document_published_revisions WHERE revision_id=initial_revision), 'unpublished IDs cannot be fetched directly';
  EXECUTE 'RESET ROLE';
  ASSERT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='site_document_published_revisions' AND column_name IN ('saved_by','updated_by','auth_id')), 'public snapshot has no author identifier';
  PERFORM set_config('request.jwt.claims','{}',true);
END;
$$;
SELECT 'PASS: initial text / unknown date / server actor and time / no-op saves / private default / publish and unpublish / immutable snapshots / role checks / direct ID denial / audit retention' AS publication_test;
