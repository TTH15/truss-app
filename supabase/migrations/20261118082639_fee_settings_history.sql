-- Fee settings and their audit entry are committed together.
CREATE TABLE public.fee_settings_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  action text NOT NULL CHECK (action IN ('baseline', 'insert', 'update', 'delete')),
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_by_auth_id uuid,
  previous_annual_fee integer,
  previous_admission_fee integer,
  previous_currency text,
  annual_fee integer,
  admission_fee integer,
  currency text
);

CREATE INDEX fee_settings_history_changed_by_idx ON public.fee_settings_history(changed_by);
ALTER TABLE public.fee_settings_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fee_settings_history FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.fee_settings_history_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fee_settings_history TO authenticated;
CREATE POLICY fee_settings_history_select_admin
  ON public.fee_settings_history FOR SELECT TO authenticated
  USING ((select public.is_admin_safe()));

-- Never invent past changes or their actors. This is the state at audit rollout.
INSERT INTO public.fee_settings_history (action, annual_fee, admission_fee, currency)
SELECT 'baseline', annual_fee, admission_fee, currency FROM public.fee_settings WHERE id = 1;

CREATE SCHEMA IF NOT EXISTS private;
CREATE FUNCTION private.record_fee_settings_history()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor_auth_id uuid := auth.uid();
  actor_id uuid;
  actor_is_admin boolean;
BEGIN
  IF actor_auth_id IS NOT NULL THEN
    SELECT id, is_admin INTO actor_id, actor_is_admin
    FROM public.users WHERE auth_id = actor_auth_id LIMIT 1;
    IF NOT coalesce(actor_is_admin, false) THEN
      RAISE EXCEPTION 'Only admins can change fee settings' USING ERRCODE = '42501';
    END IF;
  ELSIF current_setting('role', true) IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND
    ROW(OLD.annual_fee, OLD.admission_fee, OLD.currency) IS NOT DISTINCT FROM
    ROW(NEW.annual_fee, NEW.admission_fee, NEW.currency) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.fee_settings_history (
    action, changed_by, changed_by_auth_id,
    previous_annual_fee, previous_admission_fee, previous_currency,
    annual_fee, admission_fee, currency
  ) VALUES (
    lower(TG_OP), actor_id, actor_auth_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.annual_fee END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.admission_fee END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.currency END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.annual_fee END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.admission_fee END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.currency END
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.record_fee_settings_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fee_settings_record_history
  AFTER INSERT OR UPDATE OR DELETE ON public.fee_settings
  FOR EACH ROW EXECUTE FUNCTION private.record_fee_settings_history();
