
-- Replace the overly permissive groups SELECT policy with a members-only policy
DROP POLICY "Anyone can lookup group by invite code" ON public.groups;

CREATE POLICY "Group members can view groups"
ON public.groups
FOR SELECT
USING (is_group_member(id, auth.uid()));

-- Create a security definer function for invite code lookups (pre-join)
CREATE OR REPLACE FUNCTION public.lookup_group_by_invite(p_invite_code TEXT)
RETURNS TABLE (id UUID, name TEXT, emoji TEXT, banner_gradient TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.emoji, g.banner_gradient
  FROM groups g
  WHERE g.invite_code = p_invite_code
  AND g.deleted_at IS NULL;
$$;
