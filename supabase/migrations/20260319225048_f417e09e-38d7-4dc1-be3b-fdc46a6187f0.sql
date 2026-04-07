CREATE OR REPLACE FUNCTION public.handle_user_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_group RECORD;
  v_new_owner_id UUID;
BEGIN
  -- For each group where this user is the creator, transfer or soft-delete FIRST
  FOR v_group IN
    SELECT id FROM public.groups
    WHERE created_by = OLD.id AND deleted_at IS NULL
  LOOP
    SELECT gm.user_id INTO v_new_owner_id
    FROM public.group_members gm
    WHERE gm.group_id = v_group.id
      AND gm.user_id IS NOT NULL
      AND gm.user_id != OLD.id
      AND gm.status = 'active'
      AND gm.is_placeholder = false
    ORDER BY gm.joined_at ASC
    LIMIT 1;

    IF v_new_owner_id IS NOT NULL THEN
      UPDATE public.groups SET created_by = v_new_owner_id WHERE id = v_group.id;
      UPDATE public.group_members SET role = 'admin'
      WHERE group_id = v_group.id AND user_id = v_new_owner_id AND status = 'active';
    ELSE
      UPDATE public.groups SET deleted_at = now() WHERE id = v_group.id;
    END IF;
  END LOOP;

  -- Demote the user so prevent_sole_admin_leave trigger won't block
  UPDATE public.group_members
  SET role = 'member'
  WHERE user_id = OLD.id AND status = 'active' AND role = 'admin';

  -- Now safe to mark all memberships as left
  UPDATE public.group_members
  SET status = 'left', left_at = now()
  WHERE user_id = OLD.id AND status = 'active';

  RETURN OLD;
END;
$function$;