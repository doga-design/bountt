import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, RotateCcw, Plus, Camera, X, RefreshCw } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { distributeCents } from "@/lib/bountt-utils";
import { GroupMember, Expense, ExpenseSplit } from "@/types";
import { fireMemberAdded } from "@/lib/confetti-utils";

import AmountDisplay from "./AmountDisplay";
import SplitSentence from "./SplitSentence";
import CustomSplitRows from "./CustomSplitRows";
import NumpadGrid from "./NumpadGrid";
import SaveButton from "./SaveButton";
import MemberAvatarGrid from "./MemberAvatarGrid";
// PayerAvatar removed — payer is now rendered inside MemberAvatarGrid
import AddMemberSheet from "@/components/group-settings/AddMemberSheet";

interface ExpenseScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editExpense?: Expense;
  editSplits?: ExpenseSplit[];
  /** sessionStorage key for persisting in-progress draft (create mode only) */
  draftKey?: string | null;
  onFirstExpenseCreated?: () => void;
}

export default function ExpenseScreen({
  open,
  onOpenChange,
  editExpense,
  editSplits,
  draftKey,
  onFirstExpenseCreated,
}: ExpenseScreenProps) {
  const SHEET_ANIM_MS = 300;
  const { currentGroup, user, profile, groupMembers, expenses, fetchExpenses, fetchExpenseSplits, addPlaceholderMember } = useApp();
  const { toast } = useToast();
  const [showAddMember, setShowAddMember] = useState(false);

  const [slide, setSlide] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [freshFocus, setFreshFocus] = useState(false);
  const [shakeMemberId, setShakeMemberId] = useState<string | null>(null);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [prevAmount, setPrevAmount] = useState("0");
  const [shakeButton, setShakeButton] = useState(false);
  const [payerDrawerOpen, setPayerDrawerOpen] = useState(false);
  const [sheetRendered, setSheetRendered] = useState(open);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Snapshot members when drawer opens
  const membersSnapshot = useRef<GroupMember[]>([]);

  // Snapshot whether this is the first expense (captured at open time)
  const wasFirstExpenseRef = useRef(false);

  // Fires fireMemberAdded exactly once per session
  const hasAddedFirstMemberRef = useRef(false);

  const isEditMode = !!editExpense;

  // Active members from snapshot, sorted: "You" first
  const activeMembers = useMemo(() => {
    return membersSnapshot.current
      .filter((m) => m.status === "active")
      .sort((a, b) => {
        if (a.user_id === user?.id) return -1;
        if (b.user_id === user?.id) return 1;
        return 0;
      });
  }, [membersSnapshot.current, user?.id]);

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      // Snapshot members
      membersSnapshot.current = [...groupMembers];
      // Snapshot whether this will be the first expense
      wasFirstExpenseRef.current = expenses.length === 0;

      const members = groupMembers
        .filter((m) => m.status === "active")
        .sort((a, b) => {
          if (a.user_id === user?.id) return -1;
          if (b.user_id === user?.id) return 1;
          return 0;
        });

      if (isEditMode && editExpense && editSplits) {
        // Edit: check settled
        if (editExpense.is_settled) {
          toast({ title: "This expense has been settled and can't be edited.", variant: "destructive" });
          onOpenChange(false);
          return;
        }
        setAmount(String(editExpense.amount));
        setPrevAmount(String(editExpense.amount));
        setSplitMode("equal");
        setSlide(1);

        const splitMemberIds = new Set<string>();
        editSplits.forEach((s) => {
          const member = members.find(
            (m) =>
              (s.user_id && m.user_id === s.user_id) ||
              (!s.user_id && m.name === s.member_name && m.is_placeholder)
          );
          if (member) splitMemberIds.add(member.id);
        });
        // Remove payer from activeIds (grid excludes payer)
        const payerM = members.find(
          (m) =>
            (editExpense.paid_by_user_id && m.user_id === editExpense.paid_by_user_id) ||
            (!editExpense.paid_by_user_id && m.name === editExpense.paid_by_name && m.is_placeholder)
        );
        setPayerId(payerM?.id ?? null);
        // activeIds = split members minus payer
        if (splitMemberIds.size > 0) {
          const ids = new Set(splitMemberIds);
          if (payerM) ids.delete(payerM.id);
          setActiveIds(ids);
        } else {
          const ids = new Set(members.map((m) => m.id));
          if (payerM) ids.delete(payerM.id);
          setActiveIds(ids);
        }
      } else {
        // Create mode — try to restore a persisted draft
        const saved = draftKey ? sessionStorage.getItem(draftKey) : null;
        if (saved) {
          try {
            const d = JSON.parse(saved);
            setAmount(d.amount ?? "0");
            setPrevAmount(d.prevAmount ?? "0");
            setDescription(d.description ?? "");
            setSplitMode(d.splitMode ?? "equal");
            setSlide(d.slide ?? 1);
            setPayerId(d.payerId ?? null);
            setActiveIds(new Set(d.activeIds ?? []));
            setCustomAmounts(new Map(Object.entries(d.customAmounts ?? {})));
            setFocusedMemberId(d.focusedMemberId ?? null);
            setShakeButton(false);
            return; // skip default reset — draft is hydrated
          } catch {
            // malformed draft, fall through to defaults
          }
        }

        setAmount("0");
        setPrevAmount("0");
        setDescription("");
        setSplitMode("equal");
        setSlide(1);
        const selfMember = members.find((m) => m.user_id === user?.id);
        setPayerId(selfMember?.id ?? null);
        // Default: all non-payer members selected
        setActiveIds(new Set(members.filter((m) => m.id !== selfMember?.id).map((m) => m.id)));
      }
      setFocusedMemberId(null);
      setCustomAmounts(new Map());
      setShakeButton(false);
    }
  }, [open]);

  // Animate this custom bottom sheet with the same easing as ui/drawer.
  useEffect(() => {
    if (open) {
      setSheetVisible(false);
      setSheetRendered(true);
      const timer = setTimeout(() => setSheetVisible(true), 20);
      return () => clearTimeout(timer);
    }
    setSheetVisible(false);
    const timer = setTimeout(() => setSheetRendered(false), SHEET_ANIM_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // Persist draft to sessionStorage while the drawer is open (create mode only)
  useEffect(() => {
    if (!open || isEditMode || !draftKey) return;
    const draft = {
      amount,
      prevAmount,
      description,
      splitMode,
      slide,
      payerId,
      activeIds: Array.from(activeIds),
      customAmounts: Object.fromEntries(customAmounts),
      focusedMemberId,
    };
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [open, isEditMode, draftKey, amount, prevAmount, description, splitMode, slide, payerId, activeIds, customAmounts, focusedMemberId]);

  const payerMember = useMemo(() => {
    const found = activeMembers.find((m) => m.id === payerId);
    if (found) return found;
    return activeMembers.find((m) => m.user_id === user?.id);
  }, [activeMembers, payerId, user?.id]);

  // Members available for the grid (all active except payer)
  const gridMembers = useMemo(
    () => activeMembers.filter((m) => m.id !== payerMember?.id),
    [activeMembers, payerMember]
  );

  // Selected members for splits = activeIds members (these are non-payer selections)
  const selectedMembers = useMemo(
    () => activeMembers.filter((m) => activeIds.has(m.id)),
    [activeMembers, activeIds]
  );

  // splitMembers includes payer + selected members for calculation (equal distribution).
  // The payer is filtered out at payload time before sending to the RPC.
  const splitMembers = useMemo(() => {
    const members: GroupMember[] = [];
    if (payerMember) members.push(payerMember);
    selectedMembers.forEach((m) => {
      if (m.id !== payerMember?.id) members.push(m);
    });
    return members;
  }, [payerMember, selectedMembers]);

  const distributeEqually = useCallback(
    (total: number, members: GroupMember[]) => {
      const shares = distributeCents(total, members.length);
      const map = new Map<string, string>();
      members.forEach((m, i) => {
        map.set(m.id, shares[i].toFixed(2));
      });
      return map;
    },
    []
  );

  // Handle payer change
  const handleSetPayer = useCallback(
    (memberId: string) => {
      if (isEditMode) {
        toast({ title: "To change the payer, delete this expense and log a new one" });
        return;
      }
      const oldPayerId = payerId;
      setPayerId(memberId);
      setActiveIds((prev) => {
        const next = new Set(prev);
        // If new payer was selected as split member, remove them
        next.delete(memberId);
        // Old payer re-enters grid as deselected (don't add to activeIds)
        return next;
      });
      if (splitMode === "custom") {
        // Reset to equal
        setSplitMode("equal");
        setCustomAmounts(new Map());
        setFocusedMemberId(null);
      }
    },
    [isEditMode, payerId, splitMode]
  );

  const customSum = useMemo(() => {
    let sum = 0;
    for (const id of splitMembers.map((m) => m.id)) {
      sum += parseFloat(customAmounts.get(id) || "0") || 0;
    }
    return sum;
  }, [customAmounts, splitMembers]);

  const totalNum = parseFloat(amount) || 0;
  const remaining = totalNum - customSum;
  const isBalanced = Math.abs(remaining) < 0.01 && totalNum > 0;

  // Live split amounts for grid display
  const gridSplitAmounts = useMemo(() => {
    const map = new Map<string, number>();
    if (totalNum <= 0 || splitMembers.length === 0) return map;
    if (splitMode === "equal") {
      const shares = distributeCents(totalNum, splitMembers.length);
      // Map only non-payer members shown in grid
      splitMembers.forEach((m, i) => {
        if (m.id !== payerMember?.id) {
          map.set(m.id, shares[i]);
        }
      });
    } else {
      splitMembers.forEach((m) => {
        if (m.id !== payerMember?.id) {
          const val = parseFloat(customAmounts.get(m.id) || "0") || 0;
          map.set(m.id, val);
        }
      });
    }
    return map;
  }, [totalNum, splitMembers, splitMode, customAmounts, payerMember]);

  const handleDistribute = useCallback(() => {
    if (!focusedMemberId || Math.abs(remaining) < 0.01) return;
    const newAmounts = new Map(customAmounts);

    if (remaining > 0.01) {
      const others = splitMembers.filter((m) => m.id !== focusedMemberId);
      if (others.length === 0) return;
      const shares = distributeCents(remaining, others.length);
      others.forEach((m, i) => {
        const current = parseFloat(newAmounts.get(m.id) || "0") || 0;
        newAmounts.set(m.id, (current + shares[i]).toFixed(2));
      });
    } else {
      const others = splitMembers.filter((m) => m.id !== focusedMemberId);
      if (others.length === 0) return;
      const excess = Math.abs(remaining);
      const perMember = excess / others.length;
      others.forEach((m, i) => {
        const current = parseFloat(newAmounts.get(m.id) || "0") || 0;
        let newVal = current - perMember;
        if (newVal < 0) newVal = 0;
        if (i === others.length - 1) {
          let sumOthers = 0;
          others.slice(0, -1).forEach((om) => {
            sumOthers += parseFloat(newAmounts.get(om.id) || "0") || 0;
          });
          const focusedVal = parseFloat(newAmounts.get(focusedMemberId) || "0") || 0;
          newVal = Math.max(0, totalNum - sumOthers - focusedVal);
        }
        newAmounts.set(m.id, newVal.toFixed(2));
      });
    }
    setCustomAmounts(newAmounts);
  }, [focusedMemberId, remaining, splitMembers, customAmounts, totalNum]);

  const canDistribute =
    splitMode === "custom" &&
    focusedMemberId !== null &&
    splitMembers.length >= 2;

  // Handle numpad key
  const handleKey = useCallback(
    (key: string) => {
      const isCustomFocused = splitMode === "custom" && focusedMemberId && slide === 2;

      const updateField = (prev: string): string => {
        if (key === "del") {
          return prev.length <= 1 ? "0" : prev.slice(0, -1);
        }
        if (key === "." && prev.includes(".")) return prev;
        const decimals = prev.split(".")[1];
        if (decimals && decimals.length >= 2) return prev;
        if (prev === "0" && key !== ".") return key;
        if (prev.length >= 9) return prev;
        return prev + key;
      };

      if (isCustomFocused) {
        const maxForMember = (() => {
          let othersSum = 0;
          for (const m of splitMembers) {
            if (m.id !== focusedMemberId) {
              othersSum += parseFloat(customAmounts.get(m.id) || "0") || 0;
            }
          }
          return Math.max(0, totalNum - othersSum);
        })();

        if (freshFocus) {
          setFreshFocus(false);
          setCustomAmounts((prev) => {
            const next = new Map(prev);
            let newVal: string;
            if (key === "del") newVal = "0";
            else if (key === ".") newVal = "0.";
            else newVal = key;

            if (parseFloat(newVal) > maxForMember) {
              setShakeMemberId(focusedMemberId);
              setTimeout(() => setShakeMemberId(null), 350);
              return prev;
            }
            next.set(focusedMemberId!, newVal);
            return next;
          });
          return;
        }
        setCustomAmounts((prev) => {
          const next = new Map(prev);
          const current = next.get(focusedMemberId!) ?? "0";
          const newVal = updateField(current);
          if (parseFloat(newVal) > maxForMember) {
            setShakeMemberId(focusedMemberId);
            setTimeout(() => setShakeMemberId(null), 350);
            return prev;
          }
          next.set(focusedMemberId!, newVal);
          return next;
        });
      } else {
        setAmount((prev) => updateField(prev));
      }
    },
    [splitMode, focusedMemberId, slide, freshFocus, splitMembers, customAmounts, totalNum, activeIds]
  );

  const toggleMode = useCallback(() => {
    if (splitMode === "equal") {
      setSplitMode("custom");
      const total = parseFloat(amount) || 0;
      setCustomAmounts(distributeEqually(total, splitMembers));
      setFocusedMemberId(splitMembers[0]?.id ?? null);
      setFreshFocus(true);
    } else {
      setSplitMode("equal");
      setCustomAmounts(new Map());
      setFocusedMemberId(null);
    }
  }, [splitMode, amount, splitMembers, distributeEqually]);

  const handleToggleGridMember = useCallback(
    (memberId: string) => {
      setActiveIds((prev) => {
        const next = new Set(prev);
        if (next.has(memberId)) {
          next.delete(memberId);
        } else {
          next.add(memberId);
        }

        if (splitMode === "custom") {
          // Rebuild split members and redistribute
          const newSplitMembers: GroupMember[] = [];
          if (payerMember) newSplitMembers.push(payerMember);
          activeMembers.forEach((m) => {
            if (next.has(m.id) && m.id !== payerMember?.id) newSplitMembers.push(m);
          });
          const total = parseFloat(amount) || 0;
          setCustomAmounts(distributeEqually(total, newSplitMembers));
          setFocusedMemberId(newSplitMembers[0]?.id ?? null);
        }

        return next;
      });
    },
    [splitMode, amount, activeMembers, payerMember, distributeEqually]
  );

  const handleFocusRow = useCallback((memberId: string) => {
    setFocusedMemberId(memberId);
    setFreshFocus(true);
  }, []);

  // Navigate to Slide 2
  const goToSlide2 = useCallback(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      // Shake the button
      setShakeButton(true);
      setTimeout(() => setShakeButton(false), 350);
      return;
    }
    // Check if amount changed since last visit
    if (amount !== prevAmount && splitMode === "custom") {
      const total = parseFloat(amount) || 0;
      setCustomAmounts(distributeEqually(total, splitMembers));
      setFocusedMemberId(splitMembers[0]?.id ?? null);
    }
    setPrevAmount(amount);
    setSlide(2);
  }, [amount, prevAmount, splitMode, splitMembers, distributeEqually]);

  // Go back to Slide 1
  const goToSlide1 = useCallback(() => {
    setSlide(1);
  }, []);

  // Handle returning to Slide 2 after amount change on Slide 1
  useEffect(() => {
    if (slide === 2 && amount !== prevAmount) {
      // Amount changed, reset custom amounts
      if (splitMode === "custom") {
        const total = parseFloat(amount) || 0;
        setCustomAmounts(distributeEqually(total, splitMembers));
        setFocusedMemberId(splitMembers[0]?.id ?? null);
      }
      setPrevAmount(amount);
    }
  }, [slide]);

  // Save
  const handleSave = async () => {
    if (!currentGroup || !user || loading) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    if (selectedMembers.length === 0) return;

    if (splitMode === "custom" && !isBalanced) return;

    // Edit: no-change detection
    if (isEditMode && editExpense && editSplits) {
      const amountChanged = Math.abs(editExpense.amount - numAmount) > 0.001;
      const oldMemberNames = editSplits.map((s) => s.member_name).sort();
      const newMemberNames = splitMembers.map((m) => m.name).sort();
      const membersChanged = JSON.stringify(oldMemberNames) !== JSON.stringify(newMemberNames);

      if (!amountChanged && !membersChanged) {
        onOpenChange(false);
        return;
      }
    }

    setLoading(true);
    try {
      const selectedPayer = payerMember ?? activeMembers.find((m) => m.user_id === user.id);
      const paidByUserId = selectedPayer?.user_id ?? null;
      const paidByName = selectedPayer?.name ?? user.email?.split("@")[0] ?? "You";

      let splits: { user_id: string | null; member_name: string; share_amount: number }[];

      if (splitMode === "equal") {
        const shares = distributeCents(numAmount, splitMembers.length);
        splits = splitMembers
          .map((m, i) => ({
            user_id: m.user_id,
            member_name: m.name,
            share_amount: shares[i],
          }))
          .filter((s) => s.share_amount > 0);
      } else {
        splits = splitMembers
          .map((m) => ({
            user_id: m.user_id,
            member_name: m.name,
            share_amount: parseFloat(customAmounts.get(m.id) || "0") || 0,
          }))
          .filter((s) => s.share_amount > 0);
      }

      // Remove payer from splits — payer is represented by paid_by_user_id, not a split row
      // NULL-safe: when payer is a placeholder (null user_id), filter by name instead
      splits = splits.filter((s) => {
        if (paidByUserId) return s.user_id !== paidByUserId;
        return s.member_name !== paidByName;
      });

      if (isEditMode && editExpense) {
        const actorName = profile?.display_name ?? user.email?.split("@")[0] ?? "Unknown";
        const { error: rpcError } = await supabase.rpc("edit_expense", {
          p_expense_id: editExpense.id,
          p_amount: numAmount,
           p_description: description.trim() || "Quick Expense",
          p_splits: JSON.parse(JSON.stringify(splits)),
          p_actor_name: actorName,
          p_expense_type: "split",
        });

        if (rpcError) throw rpcError;

        await Promise.all([
          fetchExpenses(currentGroup.id),
          fetchExpenseSplits(currentGroup.id),
        ]);

        toast({ title: "Changes saved" });
      } else {
        const { error: rpcError } = await supabase.rpc("create_expense_with_splits", {
          p_group_id: currentGroup.id,
          p_amount: numAmount,
          p_description: description.trim() || "Quick Expense",
          p_paid_by_user_id: paidByUserId as string,
          p_paid_by_name: paidByName,
          p_splits: JSON.parse(JSON.stringify(splits)),
          p_expense_type: "split",
        });

        if (rpcError) throw rpcError;

        await fetchExpenseSplits(currentGroup.id);

        toast({ title: "Expense added" });

        console.log('[confetti] expenses.length at save time:', expenses.length);
        console.log('[confetti] wasFirstExpenseRef:', wasFirstExpenseRef.current);
        if (wasFirstExpenseRef.current) {
          console.log('[confetti] calling onFirstExpenseCreated');
          onFirstExpenseCreated?.();
        }
      }

      // Clear draft on successful save
      if (draftKey) sessionStorage.removeItem(draftKey);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: isEditMode ? "Failed to update expense" : "Failed to add expense",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sheetRendered) return null;

  const hasSelectedMembers = selectedMembers.length > 0;
  const slide2SaveActive = hasSelectedMembers && (splitMode === "equal" || isBalanced);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sheetVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer container — match @/components/ui/drawer (Vaul) chrome */}
      <div
        className={`relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-[10px] border bg-white transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sheetVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxWidth: "var(--app-frame-width)" }}
      >
        {/* Slide viewport */}
        <div className="flex-1 overflow-hidden min-h-0 relative">
          <div
            className="flex transition-transform duration-300 ease-out absolute inset-0"
            style={{
              transform: slide === 1 ? "translateX(0)" : "translateX(-50%)",
              width: "200%",
            }}
          >
            {/* ============ SLIDE 1: Amount Entry ============ */}
            <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
              {/* Drag handle — same pill as ui/drawer DrawerContent */}
              <div className="mx-auto mb-2 mt-5 h-2 w-[100px] shrink-0 rounded-full bg-muted" />

              {/* Headline (+ camera aligned to this row) */}
              <div className="flex-shrink-0 px-6 mt-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="min-w-0 flex-1 pl-1 text-left font-sans text-xl font-bold text-muted-foreground">
                    What did{" "}
                    <button
                      onClick={() => {
                        if (isEditMode) {
                          toast({ title: "To change the payer, delete this expense and log a new one" });
                          return;
                        }
                        setPayerDrawerOpen(true);
                      }}
                      className="font-extrabold underline decoration-dotted underline-offset-4 text-primary"
                    >
                      {payerMember?.user_id === user?.id ? "you" : payerMember?.name ?? "you"}
                    </button>
                    {" "}pay?
                  </h2>
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEE]"
                    aria-label="Camera"
                  >
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                {/* Description input */}
                <div
                  className="mt-2.5 flex h-[60px] w-full flex-row items-center gap-2 self-stretch rounded-[10px] bg-[#EEE] px-[10px] py-0 transition-colors focus-within:bg-[#DDD]"
                >
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 50))}
                    placeholder="What is it? (e.g Ski Pass)"
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {description.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDescription("")}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-foreground/70 transition-colors hover:bg-black/15 hover:text-foreground"
                      aria-label="Clear description"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Amount display */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <AmountDisplay amount={amount} showCursor size="large" />
              </div>

              {/* "I am covering for someone" */}
              <div className="text-center pb-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-dotted underline-offset-4">
                  I am covering for someone
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <RotateCcw className="h-3 w-3" />
                  </span>
                </span>
              </div>

              {/* Log cost button */}
              <div className={`flex-shrink-0 ${shakeButton ? "animate-shake-x" : ""}`}>
                <SaveButton
                  active={totalNum > 0}
                  loading={false}
                  onClick={goToSlide2}
                  label={isEditMode ? "Edit cost" : "Log cost"}
                  shakeOnDisabled
                />
              </div>

              {/* Numpad */}
              <div className="flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                <NumpadGrid onKey={handleKey} />
              </div>
            </div>

            {/* ============ SLIDE 2: Split Configuration ============ */}
            <div className="w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
              {/* Top bar with back arrow + drag handle */}
              <div className="flex flex-shrink-0 items-center px-6 pb-2 pt-5">
                <button
                  type="button"
                  onClick={goToSlide1}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEE]"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="flex flex-1 justify-center px-2">
                  <div className="h-2 w-[100px] shrink-0 rounded-full bg-muted" />
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEE]"
                  aria-label="Camera"
                >
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Amount display */}
              <div className="flex flex-shrink-0 flex-col items-center justify-center pb-0 pt-2">
                <AmountDisplay amount={amount} size="medium" />
              </div>

              {splitMode === "custom" &&
                (() => {
                  const overBudget = remaining < -0.01;
                  const unassigned = remaining > 0.01;
                  const showButton = canDistribute && Math.abs(remaining) > 0.01 && totalNum > 0;

                  const chipLayout =
                    "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-semibold leading-none";

                  const wrap = (node: ReactNode) => (
                    <div className="mb-2 flex shrink-0 justify-center px-4 pt-1">{node}</div>
                  );

                  if (showButton) {
                    const buttonLabel = overBudget
                      ? `Remove $${Math.abs(remaining).toFixed(2)}`
                      : `Distribute $${remaining.toFixed(2)} with others`;
                    return wrap(
                      <button
                        type="button"
                        onClick={handleDistribute}
                        className={`${chipLayout} gap-1.5 bg-primary/10 text-primary transition-transform active:scale-[0.96]`}
                      >
                        {buttonLabel}
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                      </button>,
                    );
                  }

                  if (isBalanced && totalNum > 0) return null;

                  let statusText = "assign to everyone";
                  let tone = "bg-muted text-muted-foreground";
                  if (totalNum === 0) {
                    statusText = "assign to everyone";
                  } else if (overBudget) {
                    statusText = `$${Math.abs(remaining).toFixed(2)} over total`;
                    tone = "bg-destructive/10 text-destructive";
                  } else if (unassigned) {
                    statusText = `$${remaining.toFixed(2)} left to assign`;
                    tone = "bg-primary/10 text-primary";
                  }
                  return wrap(<span className={`${chipLayout} ${tone}`}>{statusText}</span>);
                })()}

              {/* Scrollable middle section */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Split sentence */}
                <div className="pb-0 pt-2">
                  <SplitSentence
                    splitMode={splitMode}
                    onToggleMode={toggleMode}
                    selectedMembers={selectedMembers}
                    currentUserId={user?.id}
                    payerMember={payerMember}
                    onSetPayer={handleSetPayer}
                    allActiveMembers={activeMembers}
                    hidePayerDrawer={isEditMode}
                    payerDrawerOpen={payerDrawerOpen}
                    onPayerDrawerChange={setPayerDrawerOpen}
                  />
                </div>

                {/* Member avatar grid — equal mode only */}
                {splitMode === "equal" && (
                  <div className="px-0">
                    <MemberAvatarGrid
                      members={gridMembers}
                      activeIds={activeIds}
                      onToggle={handleToggleGridMember}
                      currentUserId={user?.id}
                      onAddMember={activeMembers.length < 6 ? () => setShowAddMember(true) : undefined}
                      splitAmounts={gridSplitAmounts}
                      payerMember={payerMember}
                      payerOnClick={() => {
                        if (isEditMode) {
                          toast({ title: "To change the payer, delete this expense and log a new one" });
                          return;
                        }
                        setPayerDrawerOpen(true);
                      }}
                    />
                  </div>
                )}

                {/* Custom split rows */}
                {splitMode === "custom" && (
                  <CustomSplitRows
                    members={splitMembers}
                    currentUserId={user?.id}
                    customAmounts={customAmounts}
                    focusedMemberId={focusedMemberId}
                    shakeMemberId={shakeMemberId}
                    onFocus={handleFocusRow}
                    visible
                  />
                )}
              </div>

              {splitMode === "equal" && (
                <div className="flex-shrink-0 pb-1 text-center">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-dotted underline-offset-4">
                    I am covering for someone
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <RotateCcw className="h-3 w-3" />
                    </span>
                  </span>
                </div>
              )}

              {/* Save button */}
              <div className="flex-shrink-0">
                <SaveButton
                  active={slide2SaveActive}
                  loading={loading}
                  onClick={handleSave}
                  label={isEditMode ? "Save changes" : "Add shared expense"}
                />
              </div>

              {/* Numpad for custom mode */}
              {splitMode === "custom" && (
                <div className="flex-shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                  <NumpadGrid onKey={handleKey} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add member sheet */}
      <AddMemberSheet
        open={showAddMember}
        onOpenChange={setShowAddMember}
        groupName={currentGroup?.name ?? ""}
        onAdd={async (name) => {
          if (!currentGroup) return;
          const member = await addPlaceholderMember(currentGroup.id, name);
          if (member) {
            membersSnapshot.current = [...membersSnapshot.current, member];
            setActiveIds((prev) => new Set([...prev, member.id]));
            if (!hasAddedFirstMemberRef.current) {
              hasAddedFirstMemberRef.current = true;
              fireMemberAdded();
            }
          }
        }}
      />
    </div>
  );
}
