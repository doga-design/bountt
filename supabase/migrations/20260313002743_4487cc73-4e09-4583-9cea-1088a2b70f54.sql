
-- Fix 7: Make settle_my_share idempotent
CREATE OR REPLACE FUNCTION public.settle_my_share(p_expense_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_split_id UUID;
  v_split_settled BOOLEAN;
  v_expense RECORD;
  v_actor_name TEXT;
  v_all_settled BOOLEAN;
  v_member_names TEXT[];
  v_share_amount NUMERIC;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the user's split
  SELECT id, is_settled, share_amount INTO v_split_id, v_split_settled, v_share_amount
  FROM expense_splits
  WHERE expense_id = p_expense_id AND user_id = v_actor_id;

  IF v_split_id IS NULL THEN
    RAISE EXCEPTION 'No split found for this user on this expense';
  END IF;

  -- Idempotent: if already settled, return success silently
  IF v_split_settled THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  -- Settle the split
  UPDATE expense_splits
  SET is_settled = true, settled_at = now()
  WHERE id = v_split_id;

  -- Check if ALL splits for this expense are now settled
  SELECT NOT EXISTS (
    SELECT 1 FROM expense_splits
    WHERE expense_id = p_expense_id AND is_settled = false
  ) INTO v_all_settled;

  IF v_all_settled THEN
    UPDATE expenses SET is_settled = true, updated_at = now()
    WHERE id = p_expense_id;
  END IF;

  -- Fetch expense details for snapshot
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;

  -- Fetch member names
  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  -- Get actor display name
  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_actor_id;

  -- Write activity log
  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (
    v_expense.group_id,
    v_actor_id,
    COALESCE(v_actor_name, 'Unknown'),
    'settled',
    jsonb_build_object(
      'expense_id', p_expense_id,
      'description', v_expense.description,
      'amount', v_share_amount,
      'paid_by_name', v_expense.paid_by_name,
      'member_names', to_jsonb(COALESCE(v_member_names, ARRAY[]::TEXT[]))
    ),
    jsonb_build_array(jsonb_build_object(
      'field', 'settled_by',
      'old_value', '',
      'new_value', COALESCE(v_actor_name, 'Unknown')
    ))
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;
