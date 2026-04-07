
-- Fix 1: Atomic expense + splits RPC
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_group_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_paid_by_user_id UUID,
  p_paid_by_name TEXT,
  p_created_by UUID,
  p_splits JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id UUID;
  v_expense JSONB;
  v_split JSONB;
BEGIN
  -- Verify caller is authenticated and is group member
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  -- Insert expense
  INSERT INTO expenses (group_id, amount, description, paid_by_user_id, paid_by_name, created_by, is_settled)
  VALUES (p_group_id, p_amount, p_description, p_paid_by_user_id, p_paid_by_name, p_created_by, false)
  RETURNING to_jsonb(expenses.*) INTO v_expense;

  v_expense_id := (v_expense->>'id')::UUID;

  -- Insert all splits
  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    v_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  RETURN v_expense;
END;
$function$;

-- Fix 2: Add expense_splits to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_splits;

-- Fix 3: Unique active member name index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_member_name
ON group_members (group_id, lower(name))
WHERE status = 'active';

-- Fix 9: RPC for fetching group splits efficiently
CREATE OR REPLACE FUNCTION public.get_group_splits(p_group_id UUID)
RETURNS SETOF expense_splits
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT es.*
  FROM expense_splits es
  INNER JOIN expenses e ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
  AND is_group_member(p_group_id, auth.uid());
$function$;
