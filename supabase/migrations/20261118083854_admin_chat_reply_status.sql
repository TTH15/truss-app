-- Automatic notices must not resolve member inquiries.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_automated boolean NOT NULL DEFAULT false;
CREATE INDEX messages_admin_thread_latest_idx ON public.messages
  ((CASE WHEN is_admin THEN receiver_id ELSE sender_id END), time DESC, id DESC)
  WHERE cancelled_at IS NULL AND (NOT is_admin OR (NOT is_broadcast AND NOT is_automated));

-- Full-history status is independent of the 1000-row initial display limit.
CREATE FUNCTION public.admin_chat_reply_status()
RETURNS TABLE(user_id uuid, needs_reply boolean, latest_message jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END)
    CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END,
    NOT m.is_admin,
    to_jsonb(m)
  FROM public.messages m
  WHERE (SELECT public.is_admin_safe())
    AND m.cancelled_at IS NULL
    AND (NOT m.is_admin OR (NOT m.is_broadcast AND NOT m.is_automated))
    AND (NOT m.is_admin OR (
      m.text NOT LIKE '登録が承認されました。Truss へようこそ！%'
      AND m.text NOT LIKE 'Your registration has been approved. Welcome to Truss!%'
      AND m.text NOT LIKE '学生証の再アップロードをお願いします。%'
      AND m.text NOT LIKE 'Please re-upload your student ID card.%'
      AND m.text NOT LIKE 'Please re-upload your student ID. Reason:%'
    ))
    AND (CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END) IS NOT NULL
  ORDER BY (CASE WHEN m.is_admin THEN m.receiver_id ELSE m.sender_id END), m.time DESC, m.id DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_chat_reply_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_chat_reply_status() TO authenticated;
