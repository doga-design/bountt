
-- Step 1a: Create trigger function to enforce 6-member limit
CREATE OR REPLACE FUNCTION public.enforce_group_member_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = NEW.group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;
  RETURN NEW;
END;
$$;

-- Step 1b: Create BEFORE INSERT trigger
CREATE TRIGGER trg_enforce_member_limit
BEFORE INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_limit();

-- Step 1c: Update join_group RPC with member limit check
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid, p_display_name text, p_avatar_color text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_member JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check not already active member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  -- Check group exists and not deleted
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Enforce 6-member limit
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;

  -- Handle rejoin (previously left)
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
  ) THEN
    UPDATE group_members
    SET status = 'active', left_at = NULL, avatar_color = p_avatar_color
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
    RETURNING to_jsonb(group_members.*) INTO v_member;
    RETURN v_member;
  END IF;

  -- Insert new member
  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color)
  VALUES (p_group_id, v_user_id, p_display_name, false, p_avatar_color)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$function$;

-- Step 1d: Update add_placeholder_member RPC with member limit check
CREATE OR REPLACE FUNCTION public.add_placeholder_member(p_group_id uuid, p_name text, p_avatar_color text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_member JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  -- Enforce 6-member limit
  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;

  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color)
  VALUES (p_group_id, NULL, p_name, true, p_avatar_color)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$function$;
