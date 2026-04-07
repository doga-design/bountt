DROP POLICY "Group members can view groups" ON groups;
CREATE POLICY "Group members can view groups" ON groups
FOR SELECT TO public
USING (
  (is_group_member(id, auth.uid()) AND deleted_at IS NULL)
  OR
  (auth.uid() = created_by AND deleted_at IS NOT NULL)
);