import { Expense, BalanceSummary, SmartMatchSuggestion, GroupMember } from "@/types";

// =====================================================
// INVITE CODE GENERATION
// =====================================================

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BNTT-${code}`;
}

export function generateJoinUrl(inviteCode: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/join/${inviteCode}`;
}

// =====================================================
// CURRENCY FORMATTING
// =====================================================

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount for feed display: drop .00 on round numbers,
 * keep decimals otherwise, comma-format thousands.
 */
export function formatAmount(n: number): string {
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
    return Math.round(n).toLocaleString("en-US");
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// =====================================================
// DATE FORMATTING
// =====================================================

export function formatRelativeDate(dateStr: string): string {
  // Extract date portion before "T" to handle both "2026-02-24" and ISO timestamps
  const datePart = dateStr.split("T")[0];
  const parts = datePart.split("-");
  const target = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays <= 7) return "LAST WEEK";
  if (diffDays <= 28) return Math.ceil(diffDays / 7) + " WEEKS AGO";
  if (diffDays <= 60) return "LAST MONTH";
  if (diffDays <= 365) return Math.floor(diffDays / 30) + " MONTHS AGO";
  if (diffDays <= 730) return "LAST YEAR";
  return Math.floor(diffDays / 365) + " YEARS AGO";
}

// =====================================================
// EXPENSE VALIDATION
// =====================================================

export function validateExpenseAmount(value: string): boolean {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return false;
  if (num > 999999.99) return false;
  const decimalParts = value.split(".");
  if (decimalParts.length > 1 && decimalParts[1].length > 2) return false;
  return true;
}

// =====================================================
// CENT-DISTRIBUTION ALGORITHM
// =====================================================

/**
 * Splits a total amount among N members so that all shares
 * sum to the exact total. Uses integer-cent math to avoid
 * floating-point drift.
 *
 * Returns an array of share amounts (in dollars) with length = memberCount.
 * The first `remainder` members receive 1 extra cent.
 */
export function distributeCents(totalAmount: number, memberCount: number): number[] {
  if (memberCount <= 0) return [];
  const totalCents = Math.round(totalAmount * 100);
  const baseShare = Math.floor(totalCents / memberCount);
  const remainder = totalCents - baseShare * memberCount;

  return Array.from({ length: memberCount }, (_, i) => {
    const cents = i < remainder ? baseShare + 1 : baseShare;
    return cents / 100;
  });
}

// =====================================================
// BALANCE CALCULATION
// =====================================================

export function calculateNetBalance(
  expenses: Expense[],
  userId: string
): number {
  let balance = 0;
  for (const expense of expenses) {
    if (expense.is_settled) continue;
    if (expense.paid_by_user_id === userId) {
      balance += expense.amount;
    }
  }
  return balance;
}

/**
 * @deprecated This function only sums paid amounts without accounting for splits.
 * Use the split-based balance logic in useHeroData instead for accurate net balances.
 */
export function calculateBalances(expenses: Expense[]): BalanceSummary[] {
  const balanceMap = new Map<string, BalanceSummary>();

  for (const expense of expenses) {
    if (expense.is_settled) continue;
    const key = expense.paid_by_user_id ?? expense.paid_by_name;
    if (!balanceMap.has(key)) {
      balanceMap.set(key, {
        userId: expense.paid_by_user_id,
        memberName: expense.paid_by_name,
        netBalance: 0,
      });
    }
    const entry = balanceMap.get(key)!;
    entry.netBalance += expense.amount;
  }

  return Array.from(balanceMap.values());
}

// =====================================================
// SMART MATCH DETECTION
// =====================================================

export function detectSmartMatch(
  expense1: Expense,
  expense2: Expense,
  thresholdPercent = 0.1
): SmartMatchSuggestion | null {
  if (expense1.group_id !== expense2.group_id) return null;
  if (expense1.is_settled || expense2.is_settled) return null;
  if (expense1.paid_by_user_id === expense2.paid_by_user_id) return null;

  const netDifference = Math.abs(expense1.amount - expense2.amount);
  const larger = Math.max(expense1.amount, expense2.amount);
  const differenceRatio = netDifference / larger;
  const canCallItEven = differenceRatio <= thresholdPercent;

  return { expense1, expense2, netDifference, canCallItEven };
}

// =====================================================
// PLACEHOLDER MEMBER UTILITIES
// =====================================================

export function getPlaceholderDisplayName(name: string): string {
  return name.trim();
}

export function isPlaceholderMember(member: { is_placeholder: boolean }): boolean {
  return member.is_placeholder;
}
