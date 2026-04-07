import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Group, GroupMember, Expense, ExpenseSplit, Profile, AppContextValue, BalanceSummary } from "@/types";
import { generateInviteCode, calculateBalances as calcBalances } from "@/lib/bountt-utils";
import { pickAvailableColor } from "@/lib/avatar-utils";
import { toast } from "@/hooks/use-toast";

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Groups state
  const [currentGroup, setCurrentGroupState] = useState<Group | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Members state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Expense splits state
  const [expenseSplits, setExpenseSplits] = useState<ExpenseSplit[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Realtime subscription refs
  const expensesChannelRef = useRef<RealtimeChannel | null>(null);
  const membersChannelRef = useRef<RealtimeChannel | null>(null);
  const splitsChannelRef = useRef<RealtimeChannel | null>(null);

  // Track if we already fetched groups for a given user to avoid double-fetch
  const groupsFetchedForRef = useRef<string | null>(null);

  // Ref to track current group for realtime handler closures
  const currentGroupRef = useRef<Group | null>(null);
  useEffect(() => {
    currentGroupRef.current = currentGroup;
  }, [currentGroup]);

  // FIX 5: Fetch version counter — prevents stale fetches from overwriting current data
  const fetchVersionRef = useRef(0);

  // =====================================================
  // GROUPS (defined before AUTH so it can be called there)
  // =====================================================
  const fetchGroups = useCallback(
    async (userId?: string, forceRefresh?: boolean) => {
      if (forceRefresh) {
        groupsFetchedForRef.current = null;
      }
      const uid = userId ?? user?.id;
      if (!uid) return;
      setGroupsLoading(true);
      setError(null);

      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", uid)
          .eq("status", "active");

        if (memberErr) throw memberErr;

        const groupIds = memberRows?.map((r) => r.group_id) ?? [];

        if (groupIds.length === 0) {
          setUserGroups([]);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setUserGroups((data as Group[]) ?? []);
      } catch (err) {
        groupsFetchedForRef.current = null;
        toast({ title: err instanceof Error ? err.message : "Failed to fetch groups", variant: "destructive" });
      } finally {
        setGroupsLoading(false);
      }
    },
    [user],
  );

  // =====================================================
  // AUTH
  // =====================================================
  const clearAllState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserGroups([]);
    setCurrentGroupState(null);
    setExpenses([]);
    setExpenseSplits([]);
    setGroupMembers([]);
    setGroupsLoading(false);
    setAuthLoading(false);
    groupsFetchedForRef.current = null;
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        setAuthLoading(false);

        // On initial load, verify the user still exists server-side
        // (cached JWTs survive user deletion for up to 1 hour)
        if (event === "INITIAL_SESSION") {
          const { error: getUserError } = await supabase.auth.getUser();
          if (getUserError) {
            console.warn("Session invalid (user deleted or revoked), signing out.", getUserError.message);
            await supabase.auth.signOut({ scope: "local" });
            clearAllState();
            return;
          }
        }

        setTimeout(() => fetchProfile(newSession.user.id), 0);
        if (groupsFetchedForRef.current !== newSession.user.id) {
          groupsFetchedForRef.current = newSession.user.id;
          setGroupsLoading(true);
          setTimeout(() => fetchGroups(newSession.user.id), 0);
        }
      } else {
        // Any null session — explicit sign-out, failed token refresh,
        // deleted user — clears state immediately. No exceptions.
        clearAllState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (err) {
      toast({
        title: "Sign out failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // =====================================================
  // MORE GROUPS
  // =====================================================
  const createGroup = useCallback(
    async (name: string, emoji: string): Promise<Group | null> => {
      if (!user) return null;
      setError(null);

      try {
        const inviteCode = generateInviteCode();
        const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "You";
        const { color: creatorColor, index: creatorIndex } = pickAvailableColor([], []);

        const { data, error: rpcError } = await supabase.rpc("create_group_with_creator", {
          p_name: name,
          p_emoji: emoji,
          p_invite_code: inviteCode,
          p_display_name: displayName,
          p_avatar_color: creatorColor,
          p_avatar_index: creatorIndex,
        });

        if (rpcError) throw rpcError;

        const group = data as unknown as Group;

        setUserGroups((prev) => [group, ...prev]);
        setCurrentGroupState(group);
        // FIX 2: Clear stale data from previous group
        setGroupMembers([]);
        setExpenses([]);
        setExpenseSplits([]);
        fetchVersionRef.current += 1;
        fetchMembers(group.id);
        return group;
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : "Failed to create group", variant: "destructive" });
        return null;
      }
    },
    [user, profile],
  );

  const setCurrentGroup = useCallback((group: Group | null) => {
    // Skip clearing + re-fetching if navigating back to the same group
    if (group && currentGroupRef.current?.id === group.id) {
      setCurrentGroupState(group);
      return;
    }
    setCurrentGroupState(group);
    // FIX 1 & 5: Clear arrays synchronously and increment fetch version
    setGroupMembers([]);
    setExpenses([]);
    setExpenseSplits([]);
    fetchVersionRef.current += 1;
    if (group) {
      fetchMembers(group.id);
      fetchExpenses(group.id);
      fetchExpenseSplits(group.id);
    }
  }, []);

  // =====================================================
  // MEMBERS
  // =====================================================
  const fetchMembers = useCallback(async (groupId: string) => {
    const version = fetchVersionRef.current;
    setMembersLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (fetchError) throw fetchError;
      // FIX 5: Discard stale result if group switched during fetch
      if (fetchVersionRef.current !== version) return;
      setGroupMembers((data as GroupMember[]) ?? []);
    } catch (err) {
      if (fetchVersionRef.current !== version) return;
      toast({ title: err instanceof Error ? err.message : "Failed to fetch members", variant: "destructive" });
    } finally {
      if (fetchVersionRef.current === version) setMembersLoading(false);
    }
  }, []);

  const addPlaceholderMember = useCallback(
    async (groupId: string, name: string): Promise<GroupMember | null> => {
      if (!user) return null;

      // Enforce 6-member limit (client-side UX check; DB trigger is source of truth)
      const activeCount = groupMembers.filter((m) => m.group_id === groupId && m.status === "active").length;
      if (activeCount >= 6) {
        toast({ title: "Group is full (6/6 members)" });
        return null;
      }

      // Bug 2 fix: Prevent duplicate placeholder names (client-side UX check; DB index is source of truth)
      const duplicate = groupMembers.find(
        (m) => m.group_id === groupId && m.status === "active" && m.name.toLowerCase() === name.trim().toLowerCase(),
      );
      if (duplicate) {
        toast({ title: "A member with that name already exists", variant: "destructive" });
        return null;
      }

      try {
        const activeMembers = groupMembers.filter((m) => m.group_id === groupId && m.status === "active");
        const existingColors = activeMembers.filter((m) => m.avatar_color).map((m) => m.avatar_color!);
        const existingIndices = activeMembers.filter((m) => m.avatar_index != null).map((m) => m.avatar_index!);
        const { color: newColor, index: newIndex } = pickAvailableColor(existingColors, existingIndices);

        const { data, error: insertError } = await supabase.rpc("add_placeholder_member", {
          p_group_id: groupId,
          p_name: name,
          p_avatar_color: newColor,
          p_avatar_index: newIndex,
        });

        if (insertError) throw insertError;
        const member = data as unknown as GroupMember;
        setGroupMembers((prev) => [...prev, member]);
        return member;
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : "Failed to add member", variant: "destructive" });
        return null;
      }
    },
    [user, groupMembers],
  );

  // =====================================================
  // EXPENSES
  // =====================================================
  const fetchExpenses = useCallback(async (groupId: string) => {
    const version = fetchVersionRef.current;
    setExpensesLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      // FIX 5: Discard stale result if group switched during fetch
      if (fetchVersionRef.current !== version) return;
      setExpenses((data as Expense[]) ?? []);
    } catch (err) {
      if (fetchVersionRef.current !== version) return;
      toast({ title: err instanceof Error ? err.message : "Failed to fetch expenses", variant: "destructive" });
    } finally {
      if (fetchVersionRef.current === version) setExpensesLoading(false);
    }
  }, []);

  // Fix 9: Use RPC for efficient group splits fetching
  const fetchExpenseSplits = useCallback(async (groupId: string) => {
    const version = fetchVersionRef.current;
    try {
      const { data, error: fetchError } = await supabase.rpc("get_group_splits", { p_group_id: groupId });

      if (fetchError) throw fetchError;
      // FIX 5: Discard stale result if group switched during fetch
      if (fetchVersionRef.current !== version) return;
      setExpenseSplits((data as ExpenseSplit[]) ?? []);
    } catch (err) {
      if (fetchVersionRef.current !== version) return;
      if (import.meta.env.DEV) console.error("Failed to fetch expense splits", err);
      toast({ title: "Couldn't load expense details. Pull to refresh.", variant: "destructive" });
    }
  }, []);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense | null> => {
      if (!user) return null;
      try {
        const { data, error: insertError } = await supabase.from("expenses").insert(expense).select().single();

        if (insertError) throw insertError;
        const newExpense = data as Expense;
        // Fix 10: Dedup check
        setExpenses((prev) => (prev.some((e) => e.id === newExpense.id) ? prev : [newExpense, ...prev]));
        return newExpense;
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : "Failed to add expense", variant: "destructive" });
        return null;
      }
    },
    [user],
  );

  // =====================================================
  // GROUP MANAGEMENT
  // =====================================================
  const updateGroup = useCallback(
    async (groupId: string, updates: Partial<Pick<Group, "name" | "banner_gradient" | "emoji">>) => {
      try {
        const { error: updateError } = await supabase.from("groups").update(updates).eq("id", groupId);
        if (updateError) throw updateError;
        setUserGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
        if (currentGroup?.id === groupId) {
          setCurrentGroupState((prev) => (prev ? { ...prev, ...updates } : prev));
        }
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : "Failed to update group", variant: "destructive" });
      }
    },
    [currentGroup],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        const { error: delError } = await supabase
          .from("groups")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", groupId);
        if (delError) throw delError;
        setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (currentGroup?.id === groupId) {
          setCurrentGroupState(null);
          // FIX 3: Clear stale data on delete
          setGroupMembers([]);
          setExpenses([]);
          setExpenseSplits([]);
          fetchVersionRef.current += 1;
        }
      } catch (err) {
        toast({ title: (err as any)?.message || "Failed to delete group", variant: "destructive" });
      }
    },
    [currentGroup],
  );

  const removeMember = useCallback(async (memberId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("id", memberId);
      if (updateError) throw updateError;
      setGroupMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: "left", left_at: new Date().toISOString() } : m)),
      );
    } catch (err) {
      toast({ title: (err as any)?.message || "Failed to remove member", variant: "destructive" });
    }
  }, []);

  const settleAndRemoveMember = useCallback(
    async (groupId: string, memberId: string) => {
      try {
        const { data, error: rpcError } = await supabase.rpc("settle_member_and_remove", {
          p_group_id: groupId,
          p_member_id: memberId,
        });
        if (rpcError) throw rpcError;
        await Promise.all([fetchExpenses(groupId), fetchExpenseSplits(groupId), fetchMembers(groupId)]);
        const result = data as any;
        const count = result?.splits_settled ?? 0;
        toast({
          title: count > 0 ? `Settled ${count} split${count !== 1 ? "s" : ""} and removed member` : "Member removed",
        });
      } catch (err) {
        toast({ title: (err as any)?.message || "Failed to settle and remove member", variant: "destructive" });
      }
    },
    [fetchExpenses, fetchExpenseSplits, fetchMembers],
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      try {
        const member = groupMembers.find(
          (m) => m.user_id === user.id && m.group_id === groupId && m.status === "active",
        );
        if (!member) return;

        const { error: updateError } = await supabase
          .from("group_members")
          .update({ status: "left", left_at: new Date().toISOString() })
          .eq("id", member.id);
        if (updateError) throw updateError;
        setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (currentGroup?.id === groupId) {
          setCurrentGroupState(null);
          // FIX 3: Clear stale data on leave
          setGroupMembers([]);
          setExpenses([]);
          setExpenseSplits([]);
          fetchVersionRef.current += 1;
        }
      } catch (err) {
        toast({ title: (err as any)?.message || "Failed to leave group", variant: "destructive" });
      }
    },
    [user, groupMembers, currentGroup],
  );

  const transferOwnership = useCallback(
    async (groupId: string, newOwnerId: string) => {
      if (!user) return;
      try {
        const { error: rpcError } = await supabase.rpc("transfer_group_ownership", {
          p_group_id: groupId,
          p_new_owner_id: newOwnerId,
        });
        if (rpcError) throw rpcError;
        // Refresh groups and members to reflect new ownership
        await Promise.all([fetchGroups(user.id), fetchMembers(groupId)]);
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : "Failed to transfer ownership", variant: "destructive" });
        throw err;
      }
    },
    [user, fetchGroups, fetchMembers],
  );

  const calculateBalances = useCallback((): BalanceSummary[] => {
    return calcBalances(expenses);
  }, [expenses]);

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================
  useEffect(() => {
    if (!currentGroup) {
      expensesChannelRef.current?.unsubscribe();
      membersChannelRef.current?.unsubscribe();
      splitsChannelRef.current?.unsubscribe();
      return;
    }
    expensesChannelRef.current = supabase
      .channel(`expenses:${currentGroup.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${currentGroup.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setExpenses((prev) => {
              const newExpense = payload.new as Expense;
              if (prev.some((e) => e.id === newExpense.id)) return prev;
              return [newExpense, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setExpenses((prev) =>
              prev.map((e) => (e.id === (payload.new as Expense).id ? (payload.new as Expense) : e)),
            );
          } else if (payload.eventType === "DELETE") {
            setExpenses((prev) => prev.filter((e) => e.id !== (payload.old as Expense).id));
          }
          // Fix 2: Re-fetch splits whenever expenses change to keep them in sync
          const groupId = currentGroupRef.current?.id;
          if (groupId) {
            fetchExpenseSplits(groupId);
          }
        },
      )
      .subscribe();

    membersChannelRef.current = supabase
      .channel(`members:${currentGroup.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${currentGroup.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGroupMembers((prev) => {
              const newMember = payload.new as GroupMember;
              if (prev.some((m) => m.id === newMember.id)) return prev;
              return [...prev, newMember];
            });
          } else if (payload.eventType === "UPDATE") {
            setGroupMembers((prev) =>
              prev.map((m) => (m.id === (payload.new as GroupMember).id ? (payload.new as GroupMember) : m)),
            );
          } else if (payload.eventType === "DELETE") {
            setGroupMembers((prev) => prev.filter((m) => m.id !== (payload.old as GroupMember).id));
          }
        },
      )
      .subscribe();

    // Realtime subscription for expense_splits (settlement updates)
    // NOTE: expense_splits has no group_id column, so no server-side filter is possible.
    // All split changes across all groups trigger a refetch for the current group.
    // This is a known post-launch optimization — adding group_id to expense_splits
    // would require a non-trivial schema migration and backfill.
    splitsChannelRef.current = supabase
      .channel(`splits:${currentGroup.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_splits" }, (payload) => {
        const groupId = currentGroupRef.current?.id;
        if (!groupId) return;
        // Check if the split belongs to an expense we know about
        const expenseId = (payload.new as any)?.expense_id || (payload.old as any)?.expense_id;
        if (expenseId) {
          // Always refetch splits for current group — expenses sync via their own channel
          fetchExpenseSplits(groupId);
        }
      })
      .subscribe();

    return () => {
      expensesChannelRef.current?.unsubscribe();
      membersChannelRef.current?.unsubscribe();
      splitsChannelRef.current?.unsubscribe();
    };
  }, [currentGroup?.id]);

  const value: AppContextValue = {
    user,
    session,
    profile,
    authLoading,

    currentGroup,
    userGroups,
    groupsLoading,
    groupMembers,
    membersLoading,
    expenses,
    expensesLoading,
    expenseSplits,
    error,
    setCurrentGroup,
    fetchGroups: (forceRefresh?: boolean) => fetchGroups(undefined, forceRefresh),
    createGroup,
    updateGroup,
    deleteGroup,
    fetchMembers,
    addPlaceholderMember,
    removeMember,
    settleAndRemoveMember,
    leaveGroup,
    fetchExpenses,
    addExpense,
    fetchExpenseSplits,
    calculateBalances,
    transferOwnership,
    signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export default AppContext;
