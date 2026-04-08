DROP POLICY "Authenticated users can create splits" ON expense_splits;

CREATE POLICY "Group members can create splits"
  ON expense_splits
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM expenses e
      WHERE e.id = expense_splits.expense_id
        AND is_group_member(e.group_id, auth.uid())
    )
  );