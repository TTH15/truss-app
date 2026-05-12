-- Allow authors to soft-delete their own board posts via a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION delete_board_post(p_post_id bigint)
RETURNS void AS $$
DECLARE
  v_caller_user_id uuid;
  v_is_admin boolean;
  v_author_id uuid;
BEGIN
  SELECT id, COALESCE(is_admin, FALSE) INTO v_caller_user_id, v_is_admin
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT author_id INTO v_author_id FROM board_posts WHERE id = p_post_id;
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post not found';
  END IF;

  IF NOT (v_is_admin OR v_author_id = v_caller_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE board_posts SET is_deleted = TRUE WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION delete_board_post(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_board_post(bigint) TO authenticated;
