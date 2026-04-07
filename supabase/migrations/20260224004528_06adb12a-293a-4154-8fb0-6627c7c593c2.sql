
CREATE OR REPLACE FUNCTION public.create_group_with_creator(
  p_name TEXT,
  p_emoji TEXT,
  p_invite_code TEXT,
  p_display_name TEXT,
  p_avatar_color TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_group JSONB;
  v_group_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the group
  INSERT INTO groups (name, emoji, invite_code, created_by)
  VALUES (p_name, p_emoji, p_invite_code, v_user_id)
  RETURNING to_jsonb(groups.*) INTO v_group;

  v_group_id := (v_group->>'id')::UUID;

  -- Insert the creator as admin member
  INSERT INTO group_members (group_id, user_id, name, is_placeholder, role, avatar_color)
  VALUES (v_group_id, v_user_id, p_display_name, false, 'admin', p_avatar_color);

  RETURN v_group;
END;
$$;
