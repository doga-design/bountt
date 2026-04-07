import { Layers } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/bountt-utils";

export default function BalancePill() {
  const { expenses, user, expenseSplits } = useApp();

  // Calculate net balance using the correct model:
  // - "Owed to me": sum of unsettled non-payer splits on expenses I paid
  // - "I owe": sum of my unsettled splits on expenses others paid
  let owedToMe = 0;
  let iOwe = 0;

  for (const expense of expenses) {
    if (expense.is_settled) continue;

    if (expense.paid_by_user_id === user?.id) {
      // I paid — others' unsettled splits = money owed to me
      for (const split of expenseSplits) {
        if (split.expense_id !== expense.id) continue;
        if (split.user_id === user?.id) continue; // defensive: skip payer's own split
        if (split.is_settled) continue;
        owedToMe += Number(split.share_amount);
      }
    } else {
      // Someone else paid — my unsettled split = money I owe
      for (const split of expenseSplits) {
        if (split.expense_id !== expense.id) continue;
        if (split.user_id !== user?.id) continue;
        if (split.is_settled) continue;
        iOwe += Number(split.share_amount);
      }
    }
  }

  const net = owedToMe - iOwe;

  if (net === 0) return null;

  const label = net > 0 ? `${formatCurrency(net)} owed` : `${formatCurrency(Math.abs(net))} owing`;

  return (
    <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-xl px-3 py-1.5">
      <Layers className="w-4 h-4 text-primary-foreground" />
      <span className="text-sm font-semibold text-primary-foreground">{label}</span>
    </div>
  );
}
