-- Development DB only: migrations and test run in one rolled-back transaction.
DO $$
DECLARE staff uuid; staff_auth uuid; member uuid; member_auth uuid;
  incoming integer; second_incoming integer; reply integer; claimed uuid;
BEGIN
  SELECT id, auth_id INTO STRICT staff, staff_auth FROM public.users WHERE is_admin AND auth_id IS NOT NULL LIMIT 1;
  SELECT id, auth_id INTO STRICT member, member_auth FROM public.users WHERE NOT is_admin AND auth_id IS NOT NULL LIMIT 1;
  UPDATE public.messages SET cancelled_at=now() WHERE cancelled_at IS NULL;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin,read)
    VALUES(member,staff,'検証用会員','[検証] 問い合わせ',now()-interval '3 days',false,true) RETURNING id INTO incoming;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin,is_automated)
    VALUES(staff,member,'検証用運営','[検証] 自動通知',now(),true,true);
  INSERT INTO public.push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(staff,'https://example.invalid/attention-fixture','test','test');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',staff_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  INSERT INTO public.admin_chat_attention_preferences(admin_user_id,reminder_enabled,remind_after_days) VALUES(staff,true,2);
  ASSERT EXISTS(SELECT 1 FROM public.admin_chat_attention_preferences WHERE admin_user_id=staff), 'operator can save own preferences';
  BEGIN
    INSERT INTO public.admin_chat_attention_preferences(admin_user_id) VALUES(member);
    RAISE EXCEPTION 'cross-owner insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM * FROM public.claim_admin_chat_reminders();
    RAISE EXCEPTION 'authenticated user could run delivery worker';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE service_role';
  SELECT claim_token INTO STRICT claimed FROM public.claim_admin_chat_reminders() WHERE admin_user_id=staff AND message_id=incoming;
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'concurrent worker must not claim active lease';
  UPDATE public.admin_chat_reminder_deliveries SET claimed_at=now()-interval '11 minutes';
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=1, 'expired lease can retry';
  UPDATE public.admin_chat_reminder_deliveries SET delivered_at=now();
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'successful reminder is sent once';
  EXECUTE 'RESET ROLE';
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin)
    VALUES(member,staff,'検証用会員','[検証] 新しい問い合わせ',now()-interval '1 day',false) RETURNING id INTO second_incoming;
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'respect per-operator days';
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.admin_chat_attention_preferences SET remind_after_days=1;
  INSERT INTO public.admin_chat_attention_dismissals VALUES(staff,member,second_incoming);
  EXECUTE 'RESET ROLE';
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'own dismissed mark excluded';
  EXECUTE 'SET LOCAL ROLE authenticated';
  DELETE FROM public.admin_chat_attention_dismissals;
  EXECUTE 'RESET ROLE';
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=1, 'new incoming gets own reminder';
  DELETE FROM public.admin_chat_reminder_deliveries WHERE message_id=second_incoming;
  INSERT INTO public.messages(sender_id,receiver_id,sender_name,text,time,is_admin)
    VALUES(staff,member,'検証用運営','[検証] 手動返信',now(),true) RETURNING id INTO reply;
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'manual reply excludes reminder';
  UPDATE public.messages SET cancelled_at=now() WHERE id=reply;
  UPDATE public.admin_chat_attention_preferences SET reminder_enabled=false;
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'opt-out excludes reminders';
  UPDATE public.admin_chat_attention_preferences SET reminder_enabled=true;
  UPDATE public.users SET is_admin=false WHERE id=staff;
  ASSERT (SELECT count(*) FROM public.claim_admin_chat_reminders())=0, 'former operator excluded';
  UPDATE public.users SET is_admin=true WHERE id=staff;
  UPDATE public.users SET is_admin=true WHERE id=member;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',member_auth,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT (SELECT count(*) FROM public.admin_chat_attention_preferences)=0, 'other operator cannot read your preferences';
  INSERT INTO public.admin_chat_attention_preferences(admin_user_id,show_reply_marks) VALUES(member,false);
  ASSERT (SELECT count(*) FROM public.admin_chat_attention_preferences)=1, 'other operator sees own preferences only';
  UPDATE public.admin_chat_attention_preferences SET highlight_after_days=5 WHERE admin_user_id=staff;
  EXECUTE 'RESET ROLE';
  ASSERT (SELECT highlight_after_days FROM public.admin_chat_attention_preferences WHERE admin_user_id=staff)=0, 'other operator cannot change your preferences';
  DELETE FROM public.admin_chat_attention_preferences WHERE admin_user_id=member;
  UPDATE public.users SET is_admin=false WHERE id=member;
  EXECUTE 'SET LOCAL ROLE authenticated';
  ASSERT (SELECT count(*) FROM public.admin_chat_attention_preferences)=0, 'member cannot read preferences';
  ASSERT (SELECT count(*) FROM public.admin_chat_attention_dismissals)=0, 'member cannot read dismissals';
  BEGIN
    INSERT INTO public.admin_chat_attention_preferences(admin_user_id) VALUES(member);
    RAISE EXCEPTION 'member could configure reminders';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM 1 FROM public.admin_chat_reminder_deliveries;
    RAISE EXCEPTION 'member could read deliveries';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims','{}',true);
END;
$$;
SELECT 'PASS: ownership / member denial / service-only worker / read vs reply / auto notices / delays / dismissals / new inquiry / lease / deduplication / opt-out / former admin' AS personal_attention_test;
