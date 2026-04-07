DROP POLICY "Group creator can update group" ON groups;
CREATE POLICY "Group creator can update group" ON groups
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);