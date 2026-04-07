
-- Fix 5: Auto-settle solo expenses on creation
-- Update the newer overload (with p_expense_type)
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(p_group_id uuid, p_amount numeric, p_description text, p_paid_by_user_id uuid, p_paid_by_name text, p_created_by uuid, p_splits jsonb, p_expense_type text DEFAULT 'split'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id UUID;
  v_expense JSONB;
  v_split JSONB;
  v_member_names TEXT[];
  v_actor_name TEXT;
  v_split_sum NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Validate splits don't exceed total
  SELECT COALESCE(SUM((s->>'share_amount')::NUMERIC), 0)
  INTO v_split_sum
  FROM jsonb_array_elements(p_splits) AS s;

  IF v_split_sum > p_amount + 0.01 THEN
    RAISE EXCEPTION 'Splits cannot exceed total';
  END IF;

  INSERT INTO expenses (group_id, amount, description, paid_by_user_id, paid_by_name, created_by, is_settled, expense_type)
  VALUES (p_group_id, p_amount, p_description, p_paid_by_user_id, p_paid_by_name, p_created_by, false, p_expense_type)
  RETURNING to_jsonb(expenses.*) INTO v_expense;

  v_expense_id := (v_expense->>'id')::UUID;

  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    v_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  -- Safety net: delete payer's split row if it was included
  DELETE FROM expense_splits WHERE expense_id = v_expense_id AND user_id = p_paid_by_user_id;

  -- Auto-settle solo expenses (no splits remaining = no one owes anything)
  IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = v_expense_id) THEN
    UPDATE expenses SET is_settled = true WHERE id = v_expense_id;
    v_expense := (SELECT to_jsonb(e.*) FROM expenses e WHERE e.id = v_expense_id);
  END IF;

  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_member_names
  FROM jsonb_array_elements(p_splits) AS s
  WHERE (s->>'user_id')::UUID IS DISTINCT FROM p_paid_by_user_id;

  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = auth.uid();

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot)
  VALUES (
    p_group_id,
    auth.uid(),
    COALESCE(v_actor_name, 'Unknown'),
    'added',
    jsonb_build_object(
      'expense_id', v_expense_id,
      'description', p_description,
      'amount', p_amount,
      'paid_by_name', p_paid_by_name,
      'member_names', to_jsonb(v_member_names),
      'expense_type', p_expense_type
    )
  );

  RETURN v_expense;
END;
$function$;

-- Also update the older overload (without p_expense_type)
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(p_group_id uuid, p_amount numeric, p_description text, p_paid_by_user_id uuid, p_paid_by_name text, p_created_by uuid, p_splits jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expense_id UUID;
  v_expense JSONB;
  v_split JSONB;
  v_member_names TEXT[];
  v_actor_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_group_member(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  INSERT INTO expenses (group_id, amount, description, paid_by_user_id, paid_by_name, created_by, is_settled)
  VALUES (p_group_id, p_amount, p_description, p_paid_by_user_id, p_paid_by_name, p_created_by, false)
  RETURNING to_jsonb(expenses.*) INTO v_expense;

  v_expense_id := (v_expense->>'id')::UUID;

  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    v_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  -- Safety net: delete payer's split row if it was included
  DELETE FROM expense_splits WHERE expense_id = v_expense_id AND user_id = p_paid_by_user_id;

  -- Auto-settle solo expenses
  IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = v_expense_id) THEN
    UPDATE expenses SET is_settled = true WHERE id = v_expense_id;
    v_expense := (SELECT to_jsonb(e.*) FROM expenses e WHERE e.id = v_expense_id);
  END IF;

  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_member_names
  FROM jsonb_array_elements(p_splits) AS s;

  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = auth.uid();

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot)
  VALUES (
    p_group_id,
    auth.uid(),
    COALESCE(v_actor_name, 'Unknown'),
    'added',
    jsonb_build_object(
      'expense_id', v_expense_id,
      'description', p_description,
      'amount', p_amount,
      'paid_by_name', p_paid_by_name,
      'member_names', to_jsonb(v_member_names)
    )
  );

  RETURN v_expense;
END;
$function$;
