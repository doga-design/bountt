-- Add avatar_index column
ALTER TABLE group_members ADD COLUMN avatar_index integer;

-- Backfill using current UUID hash algorithm (preserves visual continuity)
UPDATE group_members 
SET avatar_index = (('x' || left(replace(id::text, '-', ''), 8))::bit(32)::int % 5) + 1
WHERE avatar_index IS NULL;

-- Migrate hex colors to named keys
UPDATE group_members SET avatar_color = 'blue'     WHERE avatar_color = '#3B82F6';
UPDATE group_members SET avatar_color = 'purple'   WHERE avatar_color = '#8B5CF6';
UPDATE group_members SET avatar_color = 'orange'   WHERE avatar_color = '#F97316';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#F59E0B';
UPDATE group_members SET avatar_color = 'emerald'  WHERE avatar_color = '#10B981';
UPDATE group_members SET avatar_color = 'purple'   WHERE avatar_color = '#14B8A6';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#EF4444';
UPDATE group_members SET avatar_color = 'blue'     WHERE avatar_color = '#6366F1';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#F43F5E';
UPDATE group_members SET avatar_color = 'amber'    WHERE avatar_color = '#EC4899';

-- Fallback: any remaining unrecognized values → purple
UPDATE group_members 
SET avatar_color = 'purple'
WHERE avatar_color NOT IN ('emerald','blue','amber','orange','offwhite','purple');

-- Update join_group RPC with p_avatar_index parameter
CREATE OR REPLACE FUNCTION public.join_group(p_group_id uuid, p_display_name text, p_avatar_color text, p_avatar_index integer)
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

  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;

  -- Handle rejoin
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

-- Update add_placeholder_member RPC with p_avatar_index parameter
CREATE OR REPLACE FUNCTION public.add_placeholder_member(p_group_id uuid, p_name text, p_avatar_color text, p_avatar_index integer)
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

  IF (SELECT COUNT(*) FROM group_members WHERE group_id = p_group_id AND status = 'active') >= 6 THEN
    RAISE EXCEPTION 'This group is full. Maximum 6 members allowed.';
  END IF;

  INSERT INTO group_members (group_id, user_id, name, is_placeholder, avatar_color, avatar_index)
  VALUES (p_group_id, NULL, p_name, true, p_avatar_color, p_avatar_index)
  RETURNING to_jsonb(group_members.*) INTO v_member;

  RETURN v_member;
END;
$function$;

-- Update create_group_with_creator RPC with p_avatar_index parameter
CREATE OR REPLACE FUNCTION public.create_group_with_creator(p_name text, p_emoji text, p_invite_code text, p_display_name text, p_avatar_color text, p_avatar_index integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_group JSONB;
  v_group_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO groups (name, emoji, invite_code, created_by)
  VALUES (p_name, p_emoji, p_invite_code, v_user_id)
  RETURNING to_jsonb(groups.*) INTO v_group;

  v_group_id := (v_group->>'id')::UUID;

  INSERT INTO group_members (group_id, user_id, name, is_placeholder, role, avatar_color, avatar_index)
  VALUES (v_group_id, v_user_id, p_display_name, false, 'admin', p_avatar_color, p_avatar_index);

  RETURN v_group;
END;
$function$;