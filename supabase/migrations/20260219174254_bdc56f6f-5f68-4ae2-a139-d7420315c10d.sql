
-- Allow any authenticated user to look up a group by invite_code (needed for join flow)
CREATE POLICY "Anyone can lookup group by invite code"
ON public.groups
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Drop the old restrictive policy that blocked non-members
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON public.expense_splits(expense_id);
