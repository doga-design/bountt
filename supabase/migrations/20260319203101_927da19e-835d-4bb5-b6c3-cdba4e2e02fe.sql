-- Fix 4: Add group creator fallback to settle_all and settle_member_share

-- settle_all with fallback for deleted payers
CREATE OR REPLACE FUNCTION public.settle_all(p_expense_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_expense RECORD;
  v_actor_name TEXT;
  v_member_names TEXT[];
  v_payer_exists BOOLEAN;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Primary check: caller is the payer
  IF v_expense.paid_by_user_id = v_actor_id THEN
    -- Authorized as payer, proceed
    NULL;
  ELSE
    -- Fallback: if payer no longer exists, allow group creator
    v_payer_exists := false;
    IF v_expense.paid_by_user_id IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = v_expense.paid_by_user_id) INTO v_payer_exists;
    END IF;

    IF NOT v_payer_exists THEN
      IF NOT EXISTS (SELECT 1 FROM groups WHERE id = v_expense.group_id AND created_by = v_actor_id) THEN
        RAISE EXCEPTION 'Only the payer or group owner can settle all';
      END IF;
    ELSE
      RAISE EXCEPTION 'Only the payer can settle all';
    END IF;
  END IF;

  IF v_expense.is_settled THEN
    RAISE EXCEPTION 'Already fully settled';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_at = now()
  WHERE expense_id = p_expense_id AND is_settled = false;

  UPDATE expenses
  SET is_settled = true, updated_at = now()
  WHERE id = p_expense_id;

  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_actor_id;

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (
    v_expense.group_id, v_actor_id, COALESCE(v_actor_name, 'Unknown'), 'settled',
    jsonb_build_object(
      'expense_id', p_expense_id, 'description', v_expense.description,
      'amount', v_expense.amount, 'paid_by_name', v_expense.paid_by_name,
      'member_names', to_jsonb(COALESCE(v_member_names, ARRAY[]::TEXT[]))
    ),
    jsonb_build_array(jsonb_build_object(
      'field', 'settled_all', 'old_value', '', 'new_value', COALESCE(v_actor_name, 'Unknown')
    ))
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- settle_member_share with fallback for deleted payers
CREATE OR REPLACE FUNCTION public.settle_member_share(p_expense_id uuid, p_split_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_expense RECORD;
  v_split RECORD;
  v_actor_name TEXT;
  v_all_settled BOOLEAN;
  v_payer_exists BOOLEAN;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- Primary check: caller is the payer
  IF v_expense.paid_by_user_id = v_actor_id THEN
    NULL; -- Authorized
  ELSE
    -- Fallback: if payer no longer exists, allow group creator
    v_payer_exists := false;
    IF v_expense.paid_by_user_id IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = v_expense.paid_by_user_id) INTO v_payer_exists;
    END IF;

    IF NOT v_payer_exists THEN
      IF NOT EXISTS (SELECT 1 FROM groups WHERE id = v_expense.group_id AND created_by = v_actor_id) THEN
        RAISE EXCEPTION 'Only the payer or group owner can settle a member share';
      END IF;
    ELSE
      RAISE EXCEPTION 'Only the payer can settle another member''s share';
    END IF;
  END IF;

  SELECT * INTO v_split FROM expense_splits WHERE id = p_split_id AND expense_id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found for this expense';
  END IF;
  IF v_split.is_settled THEN
    RAISE EXCEPTION 'This split is already settled';
  END IF;

  UPDATE expense_splits
  SET is_settled = true, settled_at = now()
  WHERE id = p_split_id;

  SELECT NOT EXISTS (
    SELECT 1 FROM expense_splits
    WHERE expense_id = p_expense_id AND is_settled = false
  ) INTO v_all_settled;

  IF v_all_settled THEN
    UPDATE expenses SET is_settled = true, updated_at = now()
    WHERE id = p_expense_id;
  END IF;

  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = v_actor_id;

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (
    v_expense.group_id, v_actor_id, COALESCE(v_actor_name, 'Unknown'), 'settled',
    jsonb_build_object(
      'expense_id', p_expense_id, 'description', v_expense.description,
      'amount', v_split.share_amount, 'paid_by_name', v_expense.paid_by_name,
      'member_names', (SELECT to_jsonb(array_agg(member_name ORDER BY member_name)) FROM expense_splits WHERE expense_id = p_expense_id)
    ),
    jsonb_build_array(jsonb_build_object(
      'field', 'settled_member', 'old_value', '', 'new_value', v_split.member_name
    ))
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;