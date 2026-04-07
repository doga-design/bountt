import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fireFirstSettle, fireFirstCost } from "@/lib/confetti-utils";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import HeroCarousel from "@/components/dashboard/HeroCarousel";
import EmptyState from "@/components/dashboard/EmptyState";
import AddExpensePrompt from "@/components/dashboard/AddExpensePrompt";
import ExpenseScreen from "@/components/expense/ExpenseScreen";
import ExpenseFeedItem from "@/components/dashboard/ExpenseFeedItem";
import ExpenseDetailSheet from "@/components/dashboard/ExpenseDetailSheet";
import MemberAvatarRow from "@/components/dashboard/MemberAvatarRow";
import BottomNav from "@/components/BottomNav";
import { formatRelativeDate } from "@/lib/bountt-utils";
import { Expense, ExpenseSplit } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Dashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    setCurrentGroup,
    userGroups,
    currentGroup,
    groupMembers,
    expenses,
    expenseSplits,
    user,
    membersLoading,
    expensesLoading,
    groupsLoading,
  } = useApp();

  // Confetti refs — first-expense confetti fires on expense-sheet close
  const pendingFirstCostRef = useRef(false);
  const hasFirstCostFiredRef = useRef(false);
  // Confetti refs — settlement confetti fires on detail-sheet close
  const pendingSettlementRef = useRef(false);
  const hasFirstSettleFiredRef = useRef(false);

  // Auto-restore expense sheet if a draft was in progress before remount
  const draftKey = user?.id && groupId ? `expense_draft_${groupId}_${user.id}` : null;
  const sheetMarkerKey = user?.id && groupId ? `expense_sheet_open_${groupId}_${user.id}` : null;
  const [sheetOpen, setSheetOpen] = useState(() => {
    if (sheetMarkerKey && draftKey) {
      return sessionStorage.getItem(sheetMarkerKey) === "1" && !!sessionStorage.getItem(draftKey);
    }
    return false;
  });
  // Store ID instead of full object so we always derive from live data
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | undefined>(undefined);
  const [editSplits, setEditSplits] = useState<ExpenseSplit[] | undefined>(undefined);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);


  // Derive live expense from expenses array
  const detailExpense = detailExpenseId
    ? expenses.find((e) => e.id === detailExpenseId) ?? null
    : null;

  const detailOpen = detailExpenseId !== null;

  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (!open) {
      console.log('[confetti] detail closing, pendingSettlement:', pendingSettlementRef.current);
      if (pendingSettlementRef.current && !hasFirstSettleFiredRef.current) {
        console.log('[confetti] detail closed with pending settlement — firing');
        pendingSettlementRef.current = false;
        hasFirstSettleFiredRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fireFirstSettle();
          });
        });
      }
      setDetailExpenseId(null);
    }
  }, []);

  useEffect(() => {
    if (!groupId) return;

    const group = userGroups.find((g) => g.id === groupId);
    if (group) {
      setCurrentGroup(group);
      localStorage.setItem("bountt_last_group_id", groupId);
    }
  }, [groupId, userGroups, setCurrentGroup]);

  useEffect(() => {
    if (!groupId) return;
    if (groupId && !groupsLoading && userGroups.length >= 0) {
      const found = userGroups.find((g) => g.id === groupId);
      if (!found && !groupsLoading) {
        const timer = setTimeout(() => {
          if (!userGroups.find((g) => g.id === groupId)) {
            navigate("/");
            toast({ title: "Group not found or you're no longer a member" });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [groupId, userGroups, groupsLoading, navigate, toast]);

  const otherMembers = groupMembers.filter((m) => m.user_id !== user?.id);
  const hasOtherMembers = otherMembers.length > 0;
  const hasExpenses = expenses.length > 0;
  const latestMemberName = otherMembers[otherMembers.length - 1]?.name ?? "";

  const isLoading = membersLoading || expensesLoading;

  const { unsettledGroups, settledExpenses } = useMemo(() => {
    // Apply member filter if active
    const filtered = filterMemberId
      ? expenses.filter((e) => {
          const member = groupMembers.find((m) => m.id === filterMemberId);
          if (!member) return false;
          // Match as payer
          const isPayer = member.user_id
            ? e.paid_by_user_id === member.user_id
            : e.paid_by_name === member.name;
          // Match as split participant
          const isSplitMember = expenseSplits.some(
            (s) =>
              s.expense_id === e.id &&
              (member.user_id ? s.user_id === member.user_id : s.member_name === member.name)
          );
          return isPayer || isSplitMember;
        })
      : expenses;

    const unsettled = filtered.filter((e) => !e.is_settled);
    const settled = filtered.filter((e) => e.is_settled);

    const groups: { label: string; items: typeof expenses }[] = [];
    let currentLabel = "";
    for (const expense of unsettled) {
      const label = formatRelativeDate(expense.date);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(expense);
    }
    return { unsettledGroups: groups, settledExpenses: settled };
  }, [expenses, expenseSplits, filterMemberId, groupMembers]);

  const groupReady = currentGroup && currentGroup.id === groupId;
  const mode = !hasOtherMembers ? "empty" : !hasExpenses ? "prompt" : "normal";

  return (
    <div className="screen-container lg:h-full lg:min-h-0 lg:max-h-none">
      {!groupReady || isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {mode === "normal" ? (
            <HeroCarousel />
          ) : (
            <DashboardHeader
              onAddMember={undefined}
              showBalance={false}
              hideMemberAvatars={mode === "prompt"}
            />
          )}

          {mode === "empty" && <EmptyState />}

          {mode === "prompt" && (
            <AddExpensePrompt
              memberName={latestMemberName}
              onAddExpense={() => setSheetOpen(true)}
            />
          )}

          {mode === "normal" && (
            <>
              <div className="mt-4">
                <MemberAvatarRow
                  members={groupMembers}
                  currentUserId={user?.id ?? ""}
                  groupInviteCode={currentGroup?.invite_code}
                  onFilterMember={setFilterMemberId}
                />
              </div>

              <div className="flex-1 space-y-4 px-4 py-4 pb-24 lg:mx-auto lg:w-full lg:max-w-3xl lg:pb-8">
                {unsettledGroups.map((group, idx) => (
                  <div key={group.label}>
                    {idx > 0 && <div className="border-t border-border mb-3" />}
                    <p className="text-xs font-medium text-muted-foreground tracking-wider mb-2 px-1">
                      {group.label}
                    </p>
                    <div className="divide-y divide-border">
                      {group.items.map((expense) => (
                        <ExpenseFeedItem
                          key={expense.id}
                          expense={expense}
                          splits={expenseSplits.filter((s) => s.expense_id === expense.id)}
                          groupMembers={groupMembers}
                          onClick={() => setDetailExpenseId(expense.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {settledExpenses.length > 0 && (
                  <Collapsible>
                    <div className="border-t border-border mb-3" />
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground tracking-wider px-1 mb-2 w-full">
                      SETTLED
                      <ChevronDown className="w-3.5 h-3.5" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="divide-y divide-border">
                        {settledExpenses.map((expense) => (
                          <ExpenseFeedItem
                            key={expense.id}
                            expense={expense}
                            splits={expenseSplits.filter((s) => s.expense_id === expense.id)}
                            groupMembers={groupMembers}
                            onClick={() => setDetailExpenseId(expense.id)}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              <div className="lg:hidden">
                <BottomNav onFabPress={() => setSheetOpen(true)} />
              </div>

              <ExpenseDetailSheet
                open={detailOpen}
                onOpenChange={handleDetailOpenChange}
                expense={detailExpense}
                splits={expenseSplits}
                groupMembers={groupMembers}
                onSettlementComplete={() => {
                  console.log('[confetti] onSettlementComplete received in Dashboard');
                  if (!hasFirstSettleFiredRef.current) {
                    pendingSettlementRef.current = true;
                    console.log('[confetti] pendingSettlementRef set true');
                  }
                }}
                onEdit={(exp, splits) => {
                  setEditExpense(exp);
                  setEditSplits(splits);
                  setSheetOpen(true);
                }}
              />
            </>
          )}
        </>
      )}

      {/* ALWAYS mounted — never unmounted by loading states */}
      <ExpenseScreen
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (sheetMarkerKey) {
            if (o) {
              sessionStorage.setItem(sheetMarkerKey, "1");
            } else {
              sessionStorage.removeItem(sheetMarkerKey);
            }
          }
          if (!o) {
            console.log('[confetti] expense drawer closing, pendingFirstCost:', pendingFirstCostRef.current);
            if (pendingFirstCostRef.current && !hasFirstCostFiredRef.current) {
              console.log('[confetti] drawer closed with pending first cost — firing');
              pendingFirstCostRef.current = false;
              hasFirstCostFiredRef.current = true;
              requestAnimationFrame(() => requestAnimationFrame(() => fireFirstCost()));
            }
            setEditExpense(undefined);
            setEditSplits(undefined);
            if (draftKey) sessionStorage.removeItem(draftKey);
          }
        }}
        editExpense={editExpense}
        editSplits={editSplits}
        draftKey={draftKey}
        onFirstExpenseCreated={() => {
          console.log('[confetti] onFirstExpenseCreated received in Dashboard');
          if (!hasFirstCostFiredRef.current) {
            pendingFirstCostRef.current = true;
            console.log('[confetti] pendingFirstCostRef set true');
          }
        }}
      />
    </div>
  );
}
