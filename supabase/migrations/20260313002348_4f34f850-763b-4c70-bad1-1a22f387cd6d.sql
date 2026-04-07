
-- Fix 1: Block editing partially settled expenses
-- Add partial settlement check to BOTH edit_expense overloads

-- Overload WITH p_expense_type (newer version)
CREATE OR REPLACE FUNCTION public.edit_expense(p_expense_id uuid, p_amount numeric, p_description text, p_splits jsonb, p_actor_name text, p_expense_type text DEFAULT 'split'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_old_expense RECORD;
  v_old_member_names TEXT[];
  v_new_member_names TEXT[];
  v_old_sorted TEXT;
  v_new_sorted TEXT;
  v_group_id UUID;
  v_snapshot JSONB;
  v_split_sum NUMERIC;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
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

  SELECT * INTO v_old_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  IF v_old_expense.created_by != v_actor_id THEN
    RAISE EXCEPTION 'Only the creator can edit this expense';
  END IF;
  IF v_old_expense.is_settled THEN
    RAISE EXCEPTION 'This expense has been settled and cannot be edited';
  END IF;

  -- NEW: Block editing if any individual splits are already settled
  IF EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = p_expense_id AND is_settled = true) THEN
    RAISE EXCEPTION 'This expense has been partially settled and cannot be edited';
  END IF;

  v_group_id := v_old_expense.group_id;

  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_old_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  UPDATE expenses
  SET amount = p_amount, description = p_description, expense_type = p_expense_type, updated_at = now()
  WHERE id = p_expense_id;

  DELETE FROM expense_splits WHERE expense_id = p_expense_id;
  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    p_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  -- Safety net: delete payer's split row if it was included
  DELETE FROM expense_splits WHERE expense_id = p_expense_id AND user_id = v_old_expense.paid_by_user_id;

  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_new_member_names
  FROM jsonb_array_elements(p_splits) AS s
  WHERE (s->>'user_id')::UUID IS DISTINCT FROM v_old_expense.paid_by_user_id;

  v_snapshot := jsonb_build_object(
    'expense_id', p_expense_id,
    'description', p_description,
    'amount', p_amount,
    'paid_by_name', v_old_expense.paid_by_name,
    'member_names', to_jsonb(v_new_member_names),
    'expense_type', p_expense_type
  );

  IF abs(v_old_expense.amount - p_amount) > 0.001 THEN
    INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
    VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
      jsonb_build_array(jsonb_build_object(
        'field', 'amount',
        'old_value', to_char(v_old_expense.amount, 'FM999999990.00'),
        'new_value', to_char(p_amount, 'FM999999990.00')
      ))
    );
  END IF;

  IF v_old_expense.description != p_description THEN
    INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
    VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
      jsonb_build_array(jsonb_build_object(
        'field', 'description',
        'old_value', v_old_expense.description,
        'new_value', p_description
      ))
    );
  END IF;

  v_old_sorted := array_to_string(v_old_member_names, ', ');
  v_new_sorted := array_to_string(v_new_member_names, ', ');
  IF v_old_sorted IS DISTINCT FROM v_new_sorted THEN
    DECLARE
      v_removed TEXT[];
      v_added TEXT[];
      v_name TEXT;
    BEGIN
      v_removed := ARRAY[]::TEXT[];
      v_added := ARRAY[]::TEXT[];
      IF v_old_member_names IS NOT NULL THEN
        FOREACH v_name IN ARRAY v_old_member_names LOOP
          IF NOT (v_name = ANY(COALESCE(v_new_member_names, ARRAY[]::TEXT[]))) THEN
            v_removed := array_append(v_removed, v_name);
          END IF;
        END LOOP;
      END IF;
      IF v_new_member_names IS NOT NULL THEN
        FOREACH v_name IN ARRAY v_new_member_names LOOP
          IF NOT (v_name = ANY(COALESCE(v_old_member_names, ARRAY[]::TEXT[]))) THEN
            v_added := array_append(v_added, v_name);
          END IF;
        END LOOP;
      END IF;

      FOREACH v_name IN ARRAY v_removed LOOP
        INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
        VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
          jsonb_build_array(jsonb_build_object(
            'field', 'members',
            'old_value', v_name,
            'new_value', 'removed'
          ))
        );
      END LOOP;

      FOREACH v_name IN ARRAY v_added LOOP
        INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
        VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
          jsonb_build_array(jsonb_build_object(
            'field', 'members',
            'old_value', 'added',
            'new_value', v_name
          ))
        );
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Overload WITHOUT p_expense_type (older version)
CREATE OR REPLACE FUNCTION public.edit_expense(p_expense_id uuid, p_amount numeric, p_description text, p_splits jsonb, p_actor_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_old_expense RECORD;
  v_old_member_names TEXT[];
  v_new_member_names TEXT[];
  v_old_sorted TEXT;
  v_new_sorted TEXT;
  v_group_id UUID;
  v_snapshot JSONB;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_old_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  IF v_old_expense.created_by != v_actor_id THEN
    RAISE EXCEPTION 'Only the creator can edit this expense';
  END IF;
  IF v_old_expense.is_settled THEN
    RAISE EXCEPTION 'This expense has been settled and cannot be edited';
  END IF;

  -- NEW: Block editing if any individual splits are already settled
  IF EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = p_expense_id AND is_settled = true) THEN
    RAISE EXCEPTION 'This expense has been partially settled and cannot be edited';
  END IF;

  v_group_id := v_old_expense.group_id;

  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_old_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  UPDATE expenses
  SET amount = p_amount, description = p_description, updated_at = now()
  WHERE id = p_expense_id;

  DELETE FROM expense_splits WHERE expense_id = p_expense_id;
  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    p_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_new_member_names
  FROM jsonb_array_elements(p_splits) AS s;

  v_snapshot := jsonb_build_object(
    'expense_id', p_expense_id,
    'description', p_description,
    'amount', p_amount,
    'paid_by_name', v_old_expense.paid_by_name,
    'member_names', to_jsonb(v_new_member_names)
  );

  IF abs(v_old_expense.amount - p_amount) > 0.001 THEN
    INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
    VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
      jsonb_build_array(jsonb_build_object(
        'field', 'amount',
        'old_value', to_char(v_old_expense.amount, 'FM999999990.00'),
        'new_value', to_char(p_amount, 'FM999999990.00')
      ))
    );
  END IF;

  IF v_old_expense.description != p_description THEN
    INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
    VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
      jsonb_build_array(jsonb_build_object(
        'field', 'description',
        'old_value', v_old_expense.description,
        'new_value', p_description
      ))
    );
  END IF;

  v_old_sorted := array_to_string(v_old_member_names, ', ');
  v_new_sorted := array_to_string(v_new_member_names, ', ');
  IF v_old_sorted != v_new_sorted THEN
    DECLARE
      v_removed TEXT[];
      v_added TEXT[];
      v_name TEXT;
    BEGIN
      v_removed := ARRAY[]::TEXT[];
      v_added := ARRAY[]::TEXT[];
      FOREACH v_name IN ARRAY v_old_member_names LOOP
        IF NOT (v_name = ANY(v_new_member_names)) THEN
          v_removed := array_append(v_removed, v_name);
        END IF;
      END LOOP;
      FOREACH v_name IN ARRAY v_new_member_names LOOP
        IF NOT (v_name = ANY(v_old_member_names)) THEN
          v_added := array_append(v_added, v_name);
        END IF;
      END LOOP;

      FOREACH v_name IN ARRAY v_removed LOOP
        INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
        VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
          jsonb_build_array(jsonb_build_object(
            'field', 'members',
            'old_value', v_name,
            'new_value', 'removed'
          ))
        );
      END LOOP;

      FOREACH v_name IN ARRAY v_added LOOP
        INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
        VALUES (v_group_id, v_actor_id, p_actor_name, 'edited', v_snapshot,
          jsonb_build_array(jsonb_build_object(
            'field', 'members',
            'old_value', 'added',
            'new_value', v_name
          ))
        );
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;
