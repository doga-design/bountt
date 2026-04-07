
-- 1a: Fix orphaned splits — add CASCADE delete
-- First drop the existing FK if it exists, then re-add with CASCADE
ALTER TABLE expense_splits
  DROP CONSTRAINT IF EXISTS expense_splits_expense_id_fkey;

ALTER TABLE expense_splits
  ADD CONSTRAINT expense_splits_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE;

-- 1b: Create activity_log table
CREATE TABLE public.activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL REFERENCES groups(id),
  actor_id        uuid NOT NULL,
  actor_name      text NOT NULL,
  action_type     text NOT NULL CHECK (action_type IN ('added', 'edited', 'deleted', 'joined')),
  expense_snapshot jsonb,
  change_detail   jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- SELECT: group members only
CREATE POLICY "Group members can view activity log"
ON public.activity_log FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

-- No direct INSERT/UPDATE/DELETE from clients

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- 1c: Update create_expense_with_splits to log "added" activity
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_group_id uuid, p_amount numeric, p_description text,
  p_paid_by_user_id uuid, p_paid_by_name text, p_created_by uuid, p_splits jsonb
)
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

  -- Collect member names for activity log
  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_member_names
  FROM jsonb_array_elements(p_splits) AS s;

  -- Get actor display name
  SELECT COALESCE(display_name, 'Unknown') INTO v_actor_name
  FROM profiles WHERE user_id = auth.uid();

  -- Log activity
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

-- 2a: edit_expense RPC
CREATE OR REPLACE FUNCTION public.edit_expense(
  p_expense_id uuid,
  p_amount numeric,
  p_description text,
  p_splits jsonb,
  p_actor_name text
)
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

  -- Fetch and verify ownership
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

  v_group_id := v_old_expense.group_id;

  -- Fetch old member names
  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_old_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  -- Update expense
  UPDATE expenses
  SET amount = p_amount, description = p_description, updated_at = now()
  WHERE id = p_expense_id;

  -- Replace splits
  DELETE FROM expense_splits WHERE expense_id = p_expense_id;
  INSERT INTO expense_splits (expense_id, user_id, member_name, share_amount)
  SELECT
    p_expense_id,
    (s->>'user_id')::UUID,
    s->>'member_name',
    (s->>'share_amount')::NUMERIC
  FROM jsonb_array_elements(p_splits) AS s;

  -- Collect new member names
  SELECT array_agg(s->>'member_name' ORDER BY s->>'member_name')
  INTO v_new_member_names
  FROM jsonb_array_elements(p_splits) AS s;

  -- Build snapshot for all change entries
  v_snapshot := jsonb_build_object(
    'expense_id', p_expense_id,
    'description', p_description,
    'amount', p_amount,
    'paid_by_name', v_old_expense.paid_by_name,
    'member_names', to_jsonb(v_new_member_names)
  );

  -- Detect and log changes
  -- Amount changed
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

  -- Description changed
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

  -- Members changed
  v_old_sorted := array_to_string(v_old_member_names, ', ');
  v_new_sorted := array_to_string(v_new_member_names, ', ');
  IF v_old_sorted != v_new_sorted THEN
    -- Find removed members
    DECLARE
      v_removed TEXT[];
      v_added TEXT[];
      v_name TEXT;
    BEGIN
      v_removed := ARRAY[]::TEXT[];
      v_added := ARRAY[]::TEXT[];
      -- Find removed
      FOREACH v_name IN ARRAY v_old_member_names LOOP
        IF NOT (v_name = ANY(v_new_member_names)) THEN
          v_removed := array_append(v_removed, v_name);
        END IF;
      END LOOP;
      -- Find added
      FOREACH v_name IN ARRAY v_new_member_names LOOP
        IF NOT (v_name = ANY(v_old_member_names)) THEN
          v_added := array_append(v_added, v_name);
        END IF;
      END LOOP;

      -- Log each removed member
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

      -- Log each added member
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

-- 2b: delete_expense RPC
CREATE OR REPLACE FUNCTION public.delete_expense(
  p_expense_id uuid,
  p_actor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id UUID;
  v_expense RECORD;
  v_member_names TEXT[];
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch expense
  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  IF v_expense.created_by != v_actor_id THEN
    RAISE EXCEPTION 'Only the creator can delete this expense';
  END IF;

  -- Fetch member names before delete
  SELECT array_agg(member_name ORDER BY member_name)
  INTO v_member_names
  FROM expense_splits WHERE expense_id = p_expense_id;

  -- Log activity BEFORE delete
  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot)
  VALUES (
    v_expense.group_id,
    v_actor_id,
    p_actor_name,
    'deleted',
    jsonb_build_object(
      'expense_id', p_expense_id,
      'description', v_expense.description,
      'amount', v_expense.amount,
      'paid_by_name', v_expense.paid_by_name,
      'member_names', to_jsonb(COALESCE(v_member_names, ARRAY[]::TEXT[]))
    )
  );

  -- Delete expense (splits cascade)
  DELETE FROM expenses WHERE id = p_expense_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2c: log_member_joined RPC
CREATE OR REPLACE FUNCTION public.log_member_joined(
  p_group_id uuid,
  p_actor_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO activity_log (group_id, actor_id, actor_name, action_type, expense_snapshot, change_detail)
  VALUES (p_group_id, auth.uid(), p_actor_name, 'joined', NULL, NULL);
END;
$function$;
