
-- Fix 1: Add status = 'active' check to is_group_member function
-- This prevents users who have left a group from still accessing group data
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

-- Fix 2: Add database-level input constraints to enforce data integrity
-- regardless of client-side validation

-- Groups table constraints
ALTER TABLE public.groups
  ADD CONSTRAINT groups_name_length CHECK (length(name) <= 100 AND length(name) > 0),
  ADD CONSTRAINT groups_emoji_length CHECK (length(emoji) <= 10),
  ADD CONSTRAINT groups_invite_code_format CHECK (invite_code ~ '^BNTT-[A-Z0-9]{4}$');

-- Group members name constraint
ALTER TABLE public.group_members
  ADD CONSTRAINT members_name_length CHECK (length(name) <= 100 AND length(name) > 0);

-- Expenses constraints
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_description_length CHECK (length(description) <= 200 AND length(description) > 0),
  ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

-- Expense splits constraint
ALTER TABLE public.expense_splits
  ADD CONSTRAINT splits_amount_nonnegative CHECK (share_amount >= 0);
