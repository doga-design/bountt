import { User, Session } from "@supabase/supabase-js";

// =====================================================
// DATABASE TYPES
// =====================================================

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  created_by: string;
  banner_gradient: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string | null;
  name: string;
  is_placeholder: boolean;
  status: string;
  role: string;
  avatar_color: string | null;
  avatar_index: number | null;
  left_at: string | null;
  joined_at: string;
}

export interface Expense {
  id: string;
  group_id: string;
  amount: number;
  description: string;
  paid_by_user_id: string | null;
  paid_by_name: string;
  date: string;
  is_settled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  expense_type: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string | null;
  member_name: string;
  share_amount: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface SmartMatchDismissal {
  id: string;
  group_id: string;
  expense_id_1: string;
  expense_id_2: string;
  dismissed_by: string;
  dismissed_at: string;
}

export interface ActivityLog {
  id: string;
  group_id: string;
  actor_id: string;
  actor_name: string;
  action_type: 'added' | 'edited' | 'deleted' | 'joined' | 'settled';
  expense_snapshot: {
    expense_id: string;
    description: string;
    amount: number;
    paid_by_name: string;
    member_names: string[];
  } | null;
  change_detail: Array<{
    field: string;
    old_value: string;
    new_value: string;
  }> | null;
  created_at: string;
}

// =====================================================
// APP CONTEXT TYPES
// =====================================================

export interface AppState {
  // Auth
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  authLoading: boolean;
  

  // Groups
  currentGroup: Group | null;
  userGroups: Group[];
  groupsLoading: boolean;

  // Members
  groupMembers: GroupMember[];
  membersLoading: boolean;

  // Expenses
  expenses: Expense[];
  

  // Expense Splits
  expenseSplits: ExpenseSplit[];

  // General
  error: string | null;
}

export interface AppContextValue extends AppState {
  expensesLoading: boolean;
  // Group actions
  setCurrentGroup: (group: Group | null) => void;
  fetchGroups: (forceRefresh?: boolean) => Promise<void>;
  transferOwnership: (groupId: string, newOwnerId: string) => Promise<void>;
  createGroup: (name: string, emoji: string) => Promise<Group | null>;
  updateGroup: (groupId: string, updates: Partial<Pick<Group, 'name' | 'banner_gradient' | 'emoji'>>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Member actions
  fetchMembers: (groupId: string) => Promise<void>;
  addPlaceholderMember: (groupId: string, name: string) => Promise<GroupMember | null>;
  removeMember: (memberId: string) => Promise<void>;
  settleAndRemoveMember: (groupId: string, memberId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;

  // Expense actions
  fetchExpenses: (groupId: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, "id" | "created_at" | "updated_at">) => Promise<Expense | null>;
  fetchExpenseSplits: (groupId: string) => Promise<void>;

  // Balance utilities
  calculateBalances: () => BalanceSummary[];

  // Auth actions
  signOut: () => Promise<void>;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface BalanceSummary {
  userId: string | null;
  memberName: string;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface SmartMatchSuggestion {
  expense1: Expense;
  expense2: Expense;
  netDifference: number;
  canCallItEven: boolean;
}

// =====================================================
// ONBOARDING TYPES
// =====================================================

export interface OnboardingState {
  groupName: string;
  groupEmoji: string;
  createdGroup: Group | null;
}
