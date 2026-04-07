-- Fix 1: Add format validation to lookup_group_by_invite
CREATE OR REPLACE FUNCTION public.lookup_group_by_invite(p_invite_code text)
 RETURNS TABLE(id uuid, name text, emoji text, banner_gradient text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT g.id, g.name, g.emoji, g.banner_gradient
  FROM groups g
  WHERE g.invite_code = p_invite_code
  AND p_invite_code ~ '^BNTT-[A-Z0-9]{4}$'
  AND g.deleted_at IS NULL;
$$;

-- Fix 2: Create a scoped RPC for placeholder visibility during join flow
CREATE OR REPLACE FUNCTION public.get_placeholders_for_join(p_group_id uuid)
RETURNS TABLE(id uuid, name text, total_expenses numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return placeholders if the group exists and is not deleted
  IF NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = p_group_id AND g.deleted_at IS NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    gm.id,
    gm.name,
    COALESCE(SUM(es.share_amount), 0) AS total_expenses
  FROM group_members gm
  LEFT JOIN expense_splits es ON es.member_name = gm.name AND es.user_id IS NULL
    AND EXISTS (SELECT 1 FROM expenses e WHERE e.id = es.expense_id AND e.group_id = p_group_id)
  WHERE gm.group_id = p_group_id
    AND gm.is_placeholder = true
    AND gm.user_id IS NULL
    AND gm.status = 'active'
  GROUP BY gm.id, gm.name;
END;
$$;

-- Fix 2b: Drop the overly broad placeholder SELECT policy
DROP POLICY IF EXISTS "Anyone can view placeholders for claiming" ON public.group_members;