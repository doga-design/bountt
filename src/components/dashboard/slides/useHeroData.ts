import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";

export interface DebtItem {
  payerName: string;
  payerUserId: string | null;
  expenseName: string;
  amount: number;
  expenseId: string;
  createdAt: string;
  direction: "you_owe" | "owed_to_you";
}

const MAX_CHIP_AMOUNT = 30;
const MIN_AGE_DAYS = 7;

export interface AgingDebt {
  daysWaiting: number;
  personName: string;
  amount: number;
  expenseName: string;
  direction: "you_owe" | "owed_to_you";
  expenseId: string;
}

export interface HeroData {
  // Slide 1
  netBalance: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  debtsYouOwe: DebtItem[];

  // Slide 2
  agingDebts: AgingDebt[];

  // Slide 3
  contributionPct: number;
  totalUserPaid: number;
  totalGroupExpenses: number;
  hasEnoughExpenses: boolean;

  // Visibility
  showAgingSlide: boolean;
  showContributionSlide: boolean;
  slideCount: number;
}

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function useHeroData(): HeroData {
  const { expenses, expenseSplits, user } = useApp();
  const userId = user?.id ?? "";

  return useMemo(() => {
    const unsettled = expenses.filter((e) => !e.is_settled);

    let totalOwedToYou = 0;
    let totalYouOwe = 0;
    const debtsYouOwe: DebtItem[] = [];

    for (const expense of unsettled) {
      if (expense.paid_by_user_id === userId) {
        const otherSplits = expenseSplits.filter(
          (s) => s.expense_id === expense.id && s.user_id !== userId && !s.is_settled
        );
        for (const s of otherSplits) {
          totalOwedToYou += s.share_amount;
          if (
            daysSince(expense.created_at) >= MIN_AGE_DAYS &&
            s.share_amount <= MAX_CHIP_AMOUNT
          ) {
            debtsYouOwe.push({
              payerName: s.member_name,
              payerUserId: s.user_id,
              expenseName: expense.description,
              amount: s.share_amount,
              expenseId: expense.id,
              createdAt: expense.created_at,
              direction: "owed_to_you",
            });
          }
        }
      } else {
        const mySplit = expenseSplits.find(
          (s) => s.expense_id === expense.id && s.user_id === userId
        );
        if (mySplit && !mySplit.is_settled) {
          totalYouOwe += mySplit.share_amount;
          if (
            daysSince(expense.created_at) >= MIN_AGE_DAYS &&
            mySplit.share_amount <= MAX_CHIP_AMOUNT
          ) {
            debtsYouOwe.push({
              payerName: expense.paid_by_name,
              payerUserId: expense.paid_by_user_id,
              expenseName: expense.description,
              amount: mySplit.share_amount,
              expenseId: expense.id,
              createdAt: expense.created_at,
              direction: "you_owe",
            });
          }
        }
      }
    }

    debtsYouOwe.sort((a, b) => a.amount - b.amount);

    const netBalance = totalOwedToYou - totalYouOwe;

    // Slide 2: Aging Debts
    const agingDebts: AgingDebt[] = [];
    for (const expense of unsettled) {
      const days = daysSince(expense.created_at);
      if (days < 14) continue;

      if (expense.paid_by_user_id === userId) {
        const otherSplits = expenseSplits.filter(
          (s) => s.expense_id === expense.id && s.user_id !== userId && !s.is_settled
        );
        for (const s of otherSplits) {
          agingDebts.push({
            daysWaiting: days,
            personName: s.member_name,
            amount: s.share_amount,
            expenseName: expense.description,
            direction: "owed_to_you",
            expenseId: expense.id,
          });
        }
      } else {
        const mySplit = expenseSplits.find(
          (s) => s.expense_id === expense.id && s.user_id === userId
        );
        if (mySplit && !mySplit.is_settled) {
          agingDebts.push({
            daysWaiting: days,
            personName: expense.paid_by_name,
            amount: mySplit.share_amount,
            expenseName: expense.description,
            direction: "you_owe",
            expenseId: expense.id,
          });
        }
      }
    }
    agingDebts.sort((a, b) => b.daysWaiting - a.daysWaiting);

    // Slide 3: Contribution
    const totalGroupExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalUserPaid = expenses
      .filter((e) => e.paid_by_user_id === userId)
      .reduce((sum, e) => sum + e.amount, 0);
    const hasEnoughExpenses = expenses.length >= 5;
    const contributionPct =
      totalGroupExpenses > 0 ? (totalUserPaid / totalGroupExpenses) * 100 : 0;

    const showAgingSlide = agingDebts.length > 0;
    const showContributionSlide = hasEnoughExpenses;
    const slideCount = 1 + (showAgingSlide ? 1 : 0) + (showContributionSlide ? 1 : 0);

    return {
      netBalance,
      totalOwedToYou,
      totalYouOwe,
      debtsYouOwe,
      agingDebts,
      contributionPct,
      totalUserPaid,
      totalGroupExpenses,
      hasEnoughExpenses,
      showAgingSlide,
      showContributionSlide,
      slideCount,
    };
  }, [expenses, expenseSplits, userId]);
}
