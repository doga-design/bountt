
-- 1. Create security definer helper
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
  );
$$;

-- 2. Drop recursive SELECT policies
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Group members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Group members can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Group members can view splits" ON public.expense_splits;
DROP POLICY IF EXISTS "Group members can view dismissals" ON public.smart_match_dismissals;

-- 3. Recreate policies using helper function
CREATE POLICY "Members can view their groups" ON public.groups
FOR SELECT USING (
  created_by = auth.uid() OR public.is_group_member(id, auth.uid())
);

CREATE POLICY "Members can view group members" ON public.group_members
FOR SELECT USING (
  public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Group members can view expenses" ON public.expenses
FOR SELECT USING (
  public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Group members can create expenses" ON public.expenses
FOR INSERT WITH CHECK (
  auth.uid() = created_by AND public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "Group members can view splits" ON public.expense_splits
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.id = expense_splits.expense_id
      AND public.is_group_member(e.group_id, auth.uid())
  )
);

CREATE POLICY "Group members can view dismissals" ON public.smart_match_dismissals
FOR SELECT USING (
  public.is_group_member(group_id, auth.uid())
);
