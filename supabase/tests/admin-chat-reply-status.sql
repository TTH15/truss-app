-- Development DB only. Run with the migration in a transaction and roll back.
DO $$
DECLARE
  staff_id uuid;
  staff_auth uuid;
  member_id uuid;
  member_auth uuid;
  incoming_id integer;
  reply_id integer;
BEGIN
  SELECT id, auth_id INTO STRICT staff_id, staff_auth FROM public.users WHERE is_admin AND auth_id IS NOT NULL LIMIT 1;
  SELECT id, auth_id INTO STRICT member_id, member_auth FROM public.users WHERE NOT is_admin AND auth_id IS NOT NULL LIMIT 1;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin,read)
    VALUES(member_id,staff_id,'Fixture member','fixture question','2050-01-01',false,true) RETURNING id INTO incoming_id;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin,is_automated)
    SELECT staff_id,member_id,'Fixture staff','fixture automatic notice','2051-01-01'::timestamptz + n * interval '1 second',true,true FROM generate_series(1,1100) n;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin,is_broadcast)
    VALUES(staff_id,member_id,'Fixture staff','fixture broadcast','2052-01-01',true,true);
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin)
    VALUES(staff_id,member_id,'Fixture staff','登録が承認されました。Truss へようこそ！fixture','2053-01-01',true);
  ASSERT NOT EXISTS(SELECT 1 FROM (SELECT id FROM public.messages ORDER BY time DESC LIMIT 1000) recent WHERE recent.id=incoming_id), 'fixture must test beyond display limit';
  PERFORM set_config('request.jwt.claims',json_build_object('sub',staff_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT EXISTS(SELECT 1 FROM public.admin_chat_reply_status() WHERE user_id=member_id AND needs_reply AND (latest_message->>'id')::integer=incoming_id), 'read member inquiry must remain pending despite auto notices and broadcasts';
  EXECUTE 'RESET ROLE';
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin)
    VALUES(staff_id,member_id,'Fixture staff','fixture manual reply','2050-02-01',true) RETURNING id INTO reply_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT EXISTS(SELECT 1 FROM public.admin_chat_reply_status() WHERE user_id=member_id AND NOT needs_reply AND (latest_message->>'id')::integer=reply_id), 'manual reply must resolve pending inquiry';
  EXECUTE 'RESET ROLE';
  UPDATE public.messages SET cancelled_at=now() WHERE id=reply_id;
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT EXISTS(SELECT 1 FROM public.admin_chat_reply_status() WHERE user_id=member_id AND needs_reply), 'cancelled reply must not resolve inquiry';
  PERFORM set_config('request.jwt.claims',json_build_object('sub',member_auth,'role','authenticated')::text,true);
  ASSERT (SELECT count(*) FROM public.admin_chat_reply_status())=0, 'members must not see admin reply status';
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM 1 FROM public.admin_chat_reply_status();
    RAISE EXCEPTION 'anonymous access was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims','{}',true);
END;
$$;
SELECT 'PASS: full history / read vs reply / automatic notices / broadcasts / manual reply / cancellation / admin-only RPC' AS reply_status_test;
