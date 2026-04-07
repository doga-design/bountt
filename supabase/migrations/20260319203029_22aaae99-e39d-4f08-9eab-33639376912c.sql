-- Fix 3A: New RPC transfer_group_ownership
CREATE OR REPLACE FUNCTION public.transfer_group_ownership(p_group_id uuid, p_new_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller_id UUID;
  v_old_owner_id UUID;
  v_actor_name TEXT;
  v_new_owner_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is current owner
  SELECT created_by INTO v_old_owner_id FROM groups WHERE id = p_group_id;
  IF v_old_owner_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_old_owner_id != v_caller_id THEN
    RAISE EXCEPTION 'Only the current group owner can transfer ownership';
  END IF;

  -- Verify new owner is active non-placeholder member
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_new_owner_id
      AND status = 'active' AND is_placeholder = false
  ) THEN
    RAISE EXCEPTION 'New owner must be an active non-placeholder member';
  END IF;

  -- Transfer ownership
  UPDATE groups SET created_by = p_new_owner_id WHERE id = p_group_id;

  -- Update roles
  UPDATE group_members SET role = 'admin'
  WHERE group_id = p_group_id AND user_id = p_new_owner_id AND status = 'active';

  UPDATE group_members SET role = 'member'
  WHERE group_id = p_group_id AND user_id = v_caller_id AND status = 'active';

  -- Get names for activity log
  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_caller_id;

  SELECT name INTO v_new_owner_name
  FROM group_members WHERE group_id = p_group_id AND user_id = p_new_owner_id AND status = 'active';

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (
    p_group_id, v_caller_id, COALESCE(v_actor_name, 'Unknown'), 'edited', NULL,
    jsonb_build_array(jsonb_build_object(
      'field', 'ownership_transferred',
      'old_value', COALESCE(v_actor_name, 'Unknown'),
      'new_value', COALESCE(v_new_owner_name, 'Unknown')
    ))
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Fix 3B: Enhanced handle_user_deletion with ownership transfer
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark all active memberships as left
  UPDATE public.group_members
  SET status = 'left', left_at = now()
  WHERE user_id = OLD.id AND status = 'active';

  -- Handle orphaned groups where this user was the creator
  BEGIN
    -- Transfer ownership to oldest active non-placeholder member
    UPDATE public.groups g
    SET created_by = sub.new_owner_id
    FROM (
      SELECT gm.group_id, gm.user_id AS new_owner_id
      FROM public.group_members gm
      INNER JOIN public.groups gr ON gr.id = gm.group_id
      WHERE gr.created_by = OLD.id
        AND gr.deleted_at IS NULL
        AND gm.user_id IS NOT NULL
        AND gm.user_id != OLD.id
        AND gm.status = 'active'
        AND gm.is_placeholder = false
      ORDER BY gm.joined_at ASC
      LIMIT 1
    ) sub
    WHERE g.id = sub.group_id;

    -- Promote the new owner to admin
    UPDATE public.group_members gm
    SET role = 'admin'
    FROM public.groups g
    WHERE g.id = gm.group_id
      AND g.created_by = gm.user_id
      AND gm.status = 'active'
      AND gm.role != 'admin';

    -- Soft-delete groups with no eligible successor
    UPDATE public.groups
    SET deleted_at = now()
    WHERE created_by = OLD.id
      AND deleted_at IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Don't block user deletion if ownership transfer fails
    NULL;
  END;

  RETURN OLD;
END;
$function$;