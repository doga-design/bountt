import { useState, useRef, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/bountt-utils";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import type { DebtItem } from "./useHeroData";

const MAX_DISMISSALS = 4;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface Props {
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  debtsYouOwe: DebtItem[];
  groupId: string;
}

function isCoolingDown(groupId: string): boolean {
  const raw = localStorage.getItem(`bountt_hero_cooldown_${groupId}`);
  if (!raw) return false;
  return Date.now() < Number(raw);
}

export default function NetBalanceSlide({ netBalance, totalOwedToYou, totalYouOwe, debtsYouOwe, groupId }: Props) {
  const { currentGroup, fetchExpenses, fetchExpenseSplits } = useApp();
  const { toast } = useToast();
  const [debtIndex, setDebtIndex] = useState(0);
  const [dismissed, setDismissed] = useState(() => isCoolingDown(groupId));
  const dismissCount = useRef(0);

  const [pendingDebt, setPendingDebt] = useState<{ expenseId: string; amount: number; payeeName: string } | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [payConfirmLoading, setPayConfirmLoading] = useState(false);
  const [payConfirmError, setPayConfirmError] = useState<string | null>(null);
  const paypalTriggered = useRef(false);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && paypalTriggered.current && pendingDebt) {
        paypalTriggered.current = false;
        setShowPayConfirm(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [pendingDebt]);

  const handleSettleMyShare = useCallback(async (expenseId: string) => {
    if (!currentGroup) return;
    setPayConfirmLoading(true);
    setPayConfirmError(null);
    try {
      const { error } = await supabase.rpc("settle_my_share", { p_expense_id: expenseId });
      if (error) throw error;
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
      setShowPayConfirm(false);
      setPendingDebt(null);
      toast({ title: "Share settled" });
    } catch (err) {
      setPayConfirmError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setPayConfirmLoading(false);
    }
  }, [currentGroup, fetchExpenses, fetchExpenseSplits, toast]);

  const handleSettleAll = useCallback(async (expenseId: string) => {
    if (!currentGroup) return;
    try {
      const { error } = await supabase.rpc("settle_all", { p_expense_id: expenseId });
      if (error) throw error;
      await Promise.all([fetchExpenses(currentGroup.id), fetchExpenseSplits(currentGroup.id)]);
      toast({ title: "Expense fully settled" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Something went wrong. Try again.", variant: "destructive" });
    }
  }, [currentGroup, fetchExpenses, fetchExpenseSplits, toast]);

  const badge =
    netBalance > 0 ? "You're up" : netBalance === 0 ? "You're even" : "You're behind";

  const prefix = netBalance > 0 ? "+" : netBalance < 0 ? "-" : "";
  const displayAmount = formatCurrency(Math.abs(netBalance));

  const showActionRow = !dismissed && debtsYouOwe.length > 0 && debtIndex < debtsYouOwe.length;
  const currentDebt = showActionRow ? debtsYouOwe[debtIndex] : null;

  const handleNotYet = () => {
    dismissCount.current += 1;
    if (dismissCount.current >= MAX_DISMISSALS || debtIndex + 1 >= debtsYouOwe.length) {
      setDismissed(true);
      if (dismissCount.current >= MAX_DISMISSALS) {
        localStorage.setItem(`bountt_hero_cooldown_${groupId}`, String(Date.now() + COOLDOWN_MS));
      }
    } else {
      setDebtIndex((i) => i + 1);
    }
  };

  const handleCtaClick = () => {
    if (!currentDebt) return;
    if (currentDebt.direction === "owed_to_you") {
      handleSettleAll(currentDebt.expenseId);
    } else {
      setPendingDebt({ expenseId: currentDebt.expenseId, amount: currentDebt.amount, payeeName: currentDebt.payerName });
      paypalTriggered.current = true;
      window.open(`https://paypal.me`, "_blank");
    }
  };

  const isOwed = currentDebt?.direction === "owed_to_you";
  const ctaLabel = isOwed ? `Settle Up` : `Pay ${currentDebt?.payerName.split(" ")[0] ?? ""}`;
  const microCopy = currentDebt
    ? isOwed
      ? `${currentDebt.payerName} owes ${formatCurrency(currentDebt.amount)} to you`
      : `${formatCurrency(currentDebt.amount)} unsettled with ${currentDebt.payerName}`
    : "";

  return (
    <div
      className={`relative flex flex-col justify-center px-6 ${
        showActionRow ? "py-5" : "py-3"
      }`}
    >
      {/* Badge */}
      <div className="mb-2">
        <span className="inline-block text-white text-xs font-semibold">
          {badge}
        </span>
      </div>

      {/* Large balance */}
      <div className="flex items-baseline gap-0.5 mb-2">
        {prefix && (
          <span className="text-5xl font-extrabold text-white/40 font-bringbold">{prefix}</span>
        )}
        <span className="text-5xl font-bringbold text-white">{displayAmount}</span>
      </div>

      {/* Action row */}
      {showActionRow && currentDebt && (
        <div className="border-t border-white/20 pt-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {currentDebt.expenseName}
              </p>
              <p className="text-xs text-white/60">{microCopy}</p>
            </div>
            <div className="flex gap-2 ml-3 shrink-0">
              <button
                onClick={handleCtaClick}
                className="bg-white text-foreground font-bold text-xs rounded-full px-4 py-2"
              >
                {ctaLabel}
              </button>
              <button
                onClick={handleNotYet}
                className="border border-white/60 text-white font-bold text-xs rounded-full px-4 py-2"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayPal return confirmation */}
      {showPayConfirm && pendingDebt && (
        <div className="absolute inset-x-0 bottom-0 bg-background rounded-t-2xl p-4 shadow-lg z-10">
          <p className="text-sm font-semibold text-foreground mb-3">
            Did you send {formatCurrency(pendingDebt.amount)} to {pendingDebt.payeeName}?
          </p>
          {payConfirmError && <p className="text-xs text-destructive mb-2">{payConfirmError}</p>}
          <button
            onClick={() => handleSettleMyShare(pendingDebt.expenseId)}
            disabled={payConfirmLoading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold mb-2"
          >
            {payConfirmLoading ? "Settling..." : "Yes, I sent it"}
          </button>
          <button
            onClick={() => { setShowPayConfirm(false); setPendingDebt(null); setPayConfirmError(null); }}
            className="w-full text-sm text-muted-foreground font-medium py-1"
          >
            Not yet
          </button>
        </div>
      )}
    </div>
  );
}
