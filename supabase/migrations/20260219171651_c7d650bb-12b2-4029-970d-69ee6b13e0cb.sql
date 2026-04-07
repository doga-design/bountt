
-- =====================================================
-- BOUNTT DATABASE SCHEMA — PART 1: TABLES
-- =====================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🏅',
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 3. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  is_placeholder BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 4. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  paid_by_user_id UUID,
  paid_by_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. EXPENSE SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID,
  member_name TEXT NOT NULL,
  share_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- 6. SMART MATCH DISMISSALS TABLE
CREATE TABLE IF NOT EXISTS public.smart_match_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  expense_id_1 UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  expense_id_2 UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  dismissed_by UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_match_dismissals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (now group_members exists)
-- =====================================================

-- Groups: members can view
CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm.user_id FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id IS NOT NULL
    )
  );
CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creator can update group" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm2.user_id FROM public.group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id IS NOT NULL
    )
  );
CREATE POLICY "Authenticated users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Members can update their own record" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Group members can view expenses" ON public.expenses
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm.user_id FROM public.group_members gm WHERE gm.group_id = expenses.group_id AND gm.user_id IS NOT NULL
    )
  );
CREATE POLICY "Group members can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    auth.uid() IN (
      SELECT gm.user_id FROM public.group_members gm WHERE gm.group_id = expenses.group_id AND gm.user_id IS NOT NULL
    )
  );
CREATE POLICY "Expense creator can update expense" ON public.expenses
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Expense creator can delete expense" ON public.expenses
  FOR DELETE USING (auth.uid() = created_by);

-- Expense splits policies
CREATE POLICY "Group members can view splits" ON public.expense_splits
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm.user_id FROM public.group_members gm
      JOIN public.expenses e ON e.group_id = gm.group_id
      WHERE e.id = expense_splits.expense_id AND gm.user_id IS NOT NULL
    )
  );
CREATE POLICY "Authenticated users can create splits" ON public.expense_splits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Smart match dismissals policies
CREATE POLICY "Group members can view dismissals" ON public.smart_match_dismissals
  FOR SELECT USING (
    auth.uid() IN (
      SELECT gm.user_id FROM public.group_members gm WHERE gm.group_id = smart_match_dismissals.group_id AND gm.user_id IS NOT NULL
    )
  );
CREATE POLICY "Authenticated users can create dismissals" ON public.smart_match_dismissals
  FOR INSERT WITH CHECK (auth.uid() = dismissed_by);

-- =====================================================
-- TIMESTAMP TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
