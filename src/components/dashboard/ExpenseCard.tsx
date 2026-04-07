import { Check } from "lucide-react";
import { Expense, ExpenseSplit, GroupMember } from "@/types";
import { formatCurrency } from "@/lib/bountt-utils";
import { getAvatarColor } from "@/lib/avatar-utils";
import { useApp } from "@/contexts/AppContext";

interface ExpenseCardProps {
  expense: Expense;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];
  onClick?: () => void;
}

export default function ExpenseCard({ expense, splits, groupMembers, onClick }: ExpenseCardProps) {
  const { user } = useApp();
  const isPayer = expense.paid_by_user_id === user?.id;

  // Find the payer's group member record for color lookup
  const payerMember = groupMembers.find(
    (m) =>
      (expense.paid_by_user_id && m.user_id === expense.paid_by_user_id) ||
      (!expense.paid_by_user_id && m.name === expense.paid_by_name && m.is_placeholder)
  );
  const payerColor = payerMember ? getAvatarColor(payerMember).bg : '#B984E5';

  // --- Color logic ---
  const ORANGE = "#E8480A";
  const GREEN = "#10B981";

  let accentColor: string;
  let amountColor: string;

  if (expense.is_settled) {
    accentColor = GREEN;
    amountColor = "hsl(var(--muted-foreground))";
  } else if (isPayer) {
    accentColor = ORANGE;
    amountColor = ORANGE;
  } else {
    accentColor = payerColor;
    amountColor = "hsl(var(--foreground))";
  }

  // --- Subtitle: "Paid by X · Y owes $Z" ---
  const payerLabel = isPayer ? "You" : expense.paid_by_name;

  // Find the "owes" portion
  let owesText = "";
  if (!expense.is_settled) {
    if (splits.length === 1) {
      // Single-member expense, no owes text
    } else if (splits.length === 2) {
      // 2-person split
      if (isPayer) {
        const otherSplit = splits.find((s) => s.user_id !== user?.id);
        if (otherSplit) {
          owesText = `${otherSplit.member_name} owes ${formatCurrency(Number(otherSplit.share_amount))}`;
        }
      } else {
        const mySplit = splits.find((s) => s.user_id === user?.id);
        if (mySplit) {
          owesText = `You owe ${formatCurrency(Number(mySplit.share_amount))}`;
        }
      }
    } else if (splits.length > 2) {
      // 3+ person: show largest non-payer split
      if (isPayer) {
        const nonPayerSplits = splits.filter((s) => s.user_id !== user?.id);
        const largest = nonPayerSplits.sort((a, b) => Number(b.share_amount) - Number(a.share_amount))[0];
        if (largest) {
          owesText = `${largest.member_name} owes ${formatCurrency(Number(largest.share_amount))}`;
        }
      } else {
        const mySplit = splits.find((s) => s.user_id === user?.id);
        if (mySplit) {
          owesText = `You owe ${formatCurrency(Number(mySplit.share_amount))}`;
        }
      }
    }
  }

  // --- Split indicator ---
  let splitIndicator: React.ReactNode;
  if (expense.is_settled) {
    splitIndicator = (
      <span className="flex items-center gap-0.5 text-xs" style={{ color: GREEN }}>
        settled <Check className="w-3 h-3" />
      </span>
    );
  } else if (splits.length === 2) {
    const isEqual = splits.every((s) => Number(s.share_amount) === Number(splits[0].share_amount));
    splitIndicator = <span className="text-xs text-muted-foreground">{isEqual ? "50 / 50" : "custom split"}</span>;
  } else if (splits.length > 2) {
    const isEqual = splits.every((s) => Number(s.share_amount) === Number(splits[0].share_amount));
    splitIndicator = <span className="text-xs text-muted-foreground">{isEqual ? `${splits.length}-way` : "custom split"}</span>;
  } else {
    splitIndicator = null;
  }

  const settledTextClass = expense.is_settled ? "text-muted-foreground" : "";

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-2xl p-4 border-l-4 flex items-start justify-between cursor-pointer active:opacity-80 transition-opacity"
      style={{ borderColor: accentColor }}
    >
      {/* Left: title + subtitle */}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm ${settledTextClass || "text-foreground"}`}>
          {expense.description}
        </p>
        <p className="text-xs mt-0.5 flex items-center gap-0">
          <span className={`text-foreground ${isPayer ? "font-bold" : ""}`}>
            Paid by {payerLabel}
          </span>
          {owesText && (
            <>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-muted-foreground">{owesText}</span>
            </>
          )}
          {expense.is_settled && (
            <>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="flex items-center gap-0.5" style={{ color: GREEN }}>
                Settled <Check className="w-3 h-3" />
              </span>
            </>
          )}
        </p>
      </div>

      {/* Right: amount + split indicator */}
      <div className="text-right flex-shrink-0 ml-3">
        <span
          className="text-sm font-semibold"
          style={{ color: amountColor }}
        >
          {formatCurrency(Number(expense.amount))}
        </span>
        {splitIndicator && <div className="mt-0.5">{splitIndicator}</div>}
      </div>
    </div>
  );
}
