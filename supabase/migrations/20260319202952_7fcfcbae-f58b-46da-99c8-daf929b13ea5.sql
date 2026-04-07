-- Fix 2: Attach missing triggers

-- Trigger 1: Prevent sole admin from leaving
DROP TRIGGER IF EXISTS trg_prevent_sole_admin_leave ON public.group_members;
CREATE TRIGGER trg_prevent_sole_admin_leave
  BEFORE UPDATE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_sole_admin_leave();

-- Trigger 2: Handle user deletion on auth.users
-- Wrapped in exception block since auth schema may restrict trigger creation
DO $$ 
BEGIN
  CREATE TRIGGER on_auth_user_deleted
    BEFORE DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_deletion();
  RAISE NOTICE 'on_auth_user_deleted trigger created successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create on_auth_user_deleted trigger: %', SQLERRM;
END $$;