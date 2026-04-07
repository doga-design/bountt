
-- Step 1: New RPC — settle_member_share (payer settles a specific member's split)
CREATE OR REPLACE FUNCTION public.settle_member_share(p_expense_id uuid, p_split_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_expense RECORD;
  v_split RECORD;
  v_actor_name TEXT;
  v_all_settled BOOLEAN;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch expense and verify caller is the payer
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  IF v_expense.paid_by_user_id != v_actor_id THEN
    RAISE EXCEPTION 'Only the payer can settle another member''s share';
  END IF;

  -- Fetch and verify the split
  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id AND expense_id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found for this expense';
  END IF;
  IF v_split.is_settled THEN
    RAISE EXCEPTION 'This split is already settled';
  END IF;

  -- Settle the split
  UPDATE expense_splits
  SET is_settled = true, settled_at = now()
  WHERE id = p_split_id;

  -- Check if all splits are now settled
  SELECT NOT EXISTS (
    SELECT 1 FROM expense_splits
    WHERE expense_id = p_expense_id AND is_settled = false
  ) INTO v_all_settled;

  IF v_all_settled THEN
    UPDATE expenses SET is_settled = true, updated_at = now()
    WHERE id = p_expense_id;
  END IF;

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
      'amount', v_split.share_amount,
      'paid_by_name', v_expense.paid_by_name,
      'member_names', (SELECT to_jsonb(array_agg(member_name ORDER BY member_name)) FROM expense_splits WHERE expense_id = p_expense_id)
    ),
    jsonb_build_array(jsonb_build_object(
      'field', 'settled_member',
      'old_value', '',
      'new_value', v_split.member_name
    ))
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Step 2: Expression index for per-expense activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_expense_id
ON activity_log (group_id, ((expense_snapshot->>'expense_id')));
