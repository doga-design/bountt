-- Drop overly permissive claim policies - the claim_placeholder RPC (SECURITY DEFINER) handles these operations with proper validation
DROP POLICY "Users can claim placeholder expenses" ON expenses;
DROP POLICY "Users can claim placeholder splits" ON expense_splits;