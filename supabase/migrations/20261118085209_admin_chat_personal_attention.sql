CREATE TABLE public.admin_chat_attention_preferences (
  admin_user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  show_reply_marks boolean NOT NULL DEFAULT true,
  highlight_after_days integer NOT NULL DEFAULT 0 CHECK (highlight_after_days BETWEEN 0 AND 30),
  reminder_enabled boolean NOT NULL DEFAULT false,
  remind_after_days integer NOT NULL DEFAULT 1 CHECK (remind_after_days BETWEEN 1 AND 30)
);
ALTER TABLE public.admin_chat_attention_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_chat_attention_preferences FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_chat_attention_preferences TO authenticated;
CREATE POLICY admin_chat_attention_preferences_self ON public.admin_chat_attention_preferences
  FOR ALL TO authenticated
  USING (admin_user_id = (SELECT public.get_user_id()) AND (SELECT public.is_admin_safe()))
  WITH CHECK (admin_user_id = (SELECT public.get_user_id()) AND (SELECT public.is_admin_safe()));

CREATE TABLE public.admin_chat_attention_dismissals (
  admin_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_id integer NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  PRIMARY KEY(admin_user_id, thread_user_id)
);
CREATE INDEX admin_chat_attention_dismissals_thread_idx ON public.admin_chat_attention_dismissals(thread_user_id);
CREATE INDEX admin_chat_attention_dismissals_message_idx ON public.admin_chat_attention_dismissals(message_id);
ALTER TABLE public.admin_chat_attention_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_chat_attention_dismissals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_chat_attention_dismissals TO authenticated;
CREATE POLICY admin_chat_attention_dismissals_self ON public.admin_chat_attention_dismissals
  FOR ALL TO authenticated
  USING (admin_user_id = (SELECT public.get_user_id()) AND (SELECT public.is_admin_safe()))
  WITH CHECK (
    admin_user_id = (SELECT public.get_user_id()) AND (SELECT public.is_admin_safe())
    AND EXISTS (SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND m.sender_id = thread_user_id AND NOT m.is_admin AND m.cancelled_at IS NULL)
  );

-- Delivery reservations are server-only; a lease allows retry after a crashed worker.
CREATE TABLE public.admin_chat_reminder_deliveries (
  admin_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_id integer NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  claim_token uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  PRIMARY KEY(admin_user_id, message_id)
);
CREATE INDEX admin_chat_reminder_deliveries_thread_idx ON public.admin_chat_reminder_deliveries(thread_user_id);
CREATE INDEX admin_chat_reminder_deliveries_message_idx ON public.admin_chat_reminder_deliveries(message_id);
ALTER TABLE public.admin_chat_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_chat_reminder_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_chat_attention_preferences, public.admin_chat_attention_dismissals, public.admin_chat_reminder_deliveries TO service_role;

CREATE FUNCTION public.claim_admin_chat_reminders(batch_size integer DEFAULT 100)
RETURNS TABLE(admin_user_id uuid, thread_user_id uuid, message_id integer, claim_token uuid)
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  WITH latest AS MATERIALIZED (
    SELECT DISTINCT ON (CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END)
      CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END AS thread_id, m.id, m.time, m.is_admin
    FROM public.messages m
    WHERE m.cancelled_at IS NULL
      AND (NOT m.is_admin OR (NOT m.is_broadcast AND NOT m.is_automated
        AND m.text NOT LIKE '登録が承認されました。Truss へようこそ！%'
        AND m.text NOT LIKE 'Your registration has been approved. Welcome to Truss!%'
        AND m.text NOT LIKE '学生証の再アップロードをお願いします。%'
        AND m.text NOT LIKE 'Please re-upload your student ID card.%'
        AND m.text NOT LIKE 'Please re-upload your student ID. Reason:%'))
    ORDER BY (CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END), m.time DESC, m.id DESC
  ), candidates AS (
    SELECT p.admin_user_id, l.thread_id, l.id
    FROM latest l
    JOIN public.users member ON member.id = l.thread_id AND member.withdrawn_at IS NULL AND NOT member.is_admin
    CROSS JOIN public.admin_chat_attention_preferences p
    JOIN public.users staff ON staff.id = p.admin_user_id AND staff.is_admin AND staff.withdrawn_at IS NULL
    WHERE NOT l.is_admin AND p.reminder_enabled
      AND l.time <= now() - (p.remind_after_days * interval '24 hours')
      AND NOT EXISTS (SELECT 1 FROM public.admin_chat_attention_dismissals d WHERE d.admin_user_id=p.admin_user_id AND d.thread_user_id=l.thread_id AND d.message_id=l.id)
      AND EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.user_id=p.admin_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.admin_chat_reminder_deliveries d WHERE d.admin_user_id=p.admin_user_id AND d.message_id=l.id AND (d.delivered_at IS NOT NULL OR d.claimed_at > now() - interval '10 minutes'))
    ORDER BY l.time, p.admin_user_id, l.id
    LIMIT greatest(1, least(batch_size, 1000))
  )
  INSERT INTO public.admin_chat_reminder_deliveries AS delivery(admin_user_id,thread_user_id,message_id,claim_token)
    SELECT c.admin_user_id,c.thread_id,c.id,gen_random_uuid() FROM candidates c
  ON CONFLICT (admin_user_id,message_id) DO UPDATE
    SET claimed_at=now(), claim_token=EXCLUDED.claim_token
    WHERE delivery.delivered_at IS NULL AND delivery.claimed_at <= now() - interval '10 minutes'
  RETURNING delivery.admin_user_id,delivery.thread_user_id,delivery.message_id,delivery.claim_token;
$$;
REVOKE ALL ON FUNCTION public.claim_admin_chat_reminders(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_chat_reminders(integer) TO service_role;
