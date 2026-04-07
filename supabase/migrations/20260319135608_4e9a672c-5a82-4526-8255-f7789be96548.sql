CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_new_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_random_bytes BYTEA;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND created_by = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the group creator can regenerate the invite code';
  END IF;

  v_random_bytes := gen_random_bytes(4);
  v_new_code := 'BNTT-';
  FOR i IN 0..3 LOOP
    v_new_code := v_new_code || substr(v_chars, (get_byte(v_random_bytes, i) % length(v_chars)) + 1, 1);
  END LOOP;

  UPDATE groups SET invite_code = v_new_code WHERE id = p_group_id;

  RETURN jsonb_build_object('invite_code', v_new_code);
END;
$$;