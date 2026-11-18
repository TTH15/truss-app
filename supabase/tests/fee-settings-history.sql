-- Run on the development DB, in a transaction with the history migration; roll back afterwards.
DO $$
DECLARE
  admin_auth_id uuid;
  member_auth_id uuid;
  admin_user_id uuid;
  original_annual integer;
  original_admission integer;
  original_currency text;
  initial_count bigint;
  affected integer;
BEGIN
  SELECT auth_id, id INTO STRICT admin_auth_id, admin_user_id FROM public.users
    WHERE is_admin AND auth_id IS NOT NULL LIMIT 1;
  SELECT auth_id INTO STRICT member_auth_id FROM public.users
    WHERE NOT is_admin AND auth_id IS NOT NULL LIMIT 1;
  SELECT annual_fee, admission_fee, currency INTO STRICT original_annual, original_admission, original_currency
    FROM public.fee_settings WHERE id = 1;
  SELECT count(*) INTO initial_count FROM public.fee_settings_history;
  ASSERT initial_count = 1, 'rollout must capture exactly one baseline';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.fee_settings_history'::regclass), 'history RLS must be enabled';
  ASSERT NOT has_sequence_privilege('authenticated', 'public.fee_settings_history_id_seq', 'usage'), 'clients must not allocate audit IDs';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_auth_id, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.fee_settings SET annual_fee = original_annual + 1 WHERE id = 1;
  ASSERT (SELECT count(*) FROM public.fee_settings_history) = initial_count + 1, 'one update must create one entry';
  ASSERT EXISTS(SELECT 1 FROM public.fee_settings_history WHERE action = 'update'
    AND changed_by = admin_user_id AND changed_by_auth_id = admin_auth_id
    AND previous_annual_fee = original_annual AND annual_fee = original_annual + 1
    AND admission_fee = original_admission), 'server actor and before/after must be recorded';

  UPDATE public.fee_settings SET annual_fee = annual_fee WHERE id = 1;
  ASSERT (SELECT count(*) FROM public.fee_settings_history) = initial_count + 1, 'no-op must not produce history';
  INSERT INTO public.fee_settings(id, annual_fee, admission_fee, currency)
    VALUES(1, original_annual + 1, original_admission, original_currency)
    ON CONFLICT(id) DO UPDATE SET annual_fee = EXCLUDED.annual_fee, admission_fee = EXCLUDED.admission_fee, currency = EXCLUDED.currency;
  ASSERT (SELECT count(*) FROM public.fee_settings_history) = initial_count + 1, 'unchanged upsert must not produce duplicate history';
  BEGIN
    UPDATE public.fee_settings SET annual_fee = annual_fee + 10 WHERE id = 1;
    RAISE EXCEPTION 'test rollback';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  ASSERT (SELECT annual_fee FROM public.fee_settings WHERE id = 1) = original_annual + 1, 'failed change must roll back';
  ASSERT (SELECT count(*) FROM public.fee_settings_history) = initial_count + 1, 'history must roll back with settings';

  BEGIN
    INSERT INTO public.fee_settings_history(action) VALUES ('update');
    RAISE EXCEPTION 'forged history was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.fee_settings_history SET annual_fee = 0;
    RAISE EXCEPTION 'history was editable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.fee_settings_history;
    RAISE EXCEPTION 'history was deletable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  DELETE FROM public.fee_settings WHERE id = 1;
  ASSERT EXISTS(SELECT 1 FROM public.fee_settings_history WHERE action = 'delete' AND previous_annual_fee = original_annual + 1 AND annual_fee IS NULL), 'deletion must preserve old settings';
  INSERT INTO public.fee_settings(id, annual_fee, admission_fee, currency) VALUES(1, original_annual, original_admission, original_currency);
  ASSERT EXISTS(SELECT 1 FROM public.fee_settings_history WHERE action = 'insert' AND previous_annual_fee IS NULL AND annual_fee = original_annual), 'recreation must be recorded';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', member_auth_id, 'role', 'authenticated')::text, true);
  ASSERT (SELECT count(*) FROM public.fee_settings_history) = 0, 'members must not see history';
  UPDATE public.fee_settings SET annual_fee = 0 WHERE id = 1;
  GET DIAGNOSTICS affected = ROW_COUNT;
  ASSERT affected = 0, 'members must not change settings';
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM 1 FROM public.fee_settings_history;
    RAISE EXCEPTION 'anonymous access was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', '{}', true);
  ASSERT NOT has_function_privilege('authenticated', 'private.record_fee_settings_history()', 'execute'), 'direct audit function calls must be revoked';
END;
$$;
SELECT 'PASS: baseline / actor / update / no-op / atomic rollback / immutable history / delete and insert / admin-only access' AS fee_audit_test;
