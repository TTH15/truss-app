-- 一般ユーザーは users の RLS で自分の行しか読めないため、運営チャット用の受信箱ユーザー ID を返す RPC
CREATE OR REPLACE FUNCTION public.get_staff_inbox_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_approved_safe() OR public.is_admin_safe()) THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT u.id
    FROM public.users u
    WHERE u.is_admin = true
      AND u.approved = true
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_inbox_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_staff_inbox_user_id() TO authenticated;
