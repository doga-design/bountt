
-- Fix 1: Add invite code validation to join_group RPC
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid, p_display_name text, p_avatar_color text, p_avatar_index integer, p_invite_code text DEFAULT NULL)
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

  -- Validate invite code server-side
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND invite_code = p_invite_code AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;

  -- Handle rejoin (also requires valid invite code, already checked above)
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
  ) THEN
    UPDATE group_members
    SET status = 'active', left_at = NULL, avatar_color = p_avatar_color, avatar_index = p_avatar_index
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'left'
    RETURNING to_jsonb(group_members.*) INTO v_member;
    RETURN v_member;
  END IF;

  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color, avatar_index)
  VALUES (p_group_id, v_user_id, p_display_name, false, p_avatar_color, p_avatar_index)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$function$;

-- Fix 2: Add invite code validation to claim_placeholder RPC
CREATE OR REPLACE FUNCTION public.claim_placeholder(p_placeholder_id uuid, p_invite_code text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_group_id UUID;
  v_placeholder_name TEXT;
  v_display_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get placeholder details and lock the row
  SELECT group_id, name INTO v_group_id, v_placeholder_name
  FROM group_members
  WHERE id = p_placeholder_id
    AND is_placeholder = true
    AND user_id IS NULL
  FOR UPDATE;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Placeholder not found or already claimed';
  END IF;

  -- Validate invite code server-side
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = v_group_id AND invite_code = p_invite_code AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Check if user is already an active member of this group
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = v_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  -- Get user's display name
  SELECT display_name INTO v_display_name
  FROM profiles
  WHERE profiles.user_id = v_user_id;

  -- Claim the placeholder
  UPDATE group_members
  SET user_id = v_user_id,
      is_placeholder = false,
      name = COALESCE(v_display_name, v_placeholder_name)
  WHERE id = p_placeholder_id;

  -- Update expense_splits for this placeholder's expenses in this group
  UPDATE expense_splits es
  SET user_id = v_user_id
  WHERE es.member_name = v_placeholder_name
    AND es.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = es.expense_id AND e.group_id = v_group_id
    );

  -- Also transfer paid_by_user_id on expenses the placeholder paid
  UPDATE expenses
  SET paid_by_user_id = v_user_id,
      paid_by_name = COALESCE(v_display_name, v_placeholder_name)
  WHERE group_id = v_group_id
    AND paid_by_name = v_placeholder_name
    AND paid_by_user_id IS NULL;

  RETURN v_group_id;
END;
$function$;

-- Fix 3: Remove the broad placeholder claim RLS policy
DROP POLICY IF EXISTS "Authenticated users can claim placeholders" ON public.group_members;
