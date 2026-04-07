
-- group_members: add status, left_at, role columns
ALTER TABLE public.group_members ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE public.group_members ADD COLUMN left_at timestamptz;
ALTER TABLE public.group_members ADD COLUMN role text NOT NULL DEFAULT 'member';

-- groups: add banner_gradient and deleted_at for soft delete
ALTER TABLE public.groups ADD COLUMN banner_gradient text NOT NULL DEFAULT 'orange-red';
ALTER TABLE public.groups ADD COLUMN deleted_at timestamptz;

-- Allow group creator to delete (remove) members
CREATE POLICY "Group creator can delete members"
ON public.group_members FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = auth.uid()
  )
);

-- Drop old creator-only update policy on groups, replace with member-level update
DROP POLICY IF EXISTS "Group creator can update group" ON public.groups;

CREATE POLICY "Group members can update group"
ON public.groups FOR UPDATE TO authenticated
USING (is_group_member(id, auth.uid()));

-- Allow members to update their own status (for leaving)
-- Already have "Members can update their own record" policy, so this is covered.

-- Allow group creator to update any member (for role changes, removal)
CREATE POLICY "Group creator can update members"
ON public.group_members FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id
    AND g.created_by = auth.uid()
  )
);

-- Allow soft-delete of groups by creator
CREATE POLICY "Group creator can delete group"
ON public.groups FOR DELETE TO authenticated
USING (auth.uid() = created_by);
