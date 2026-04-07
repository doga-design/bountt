import { RefreshCw } from "lucide-react";

interface AmountDisplayProps {
  amount: string;
  showCursor?: boolean;
  size?: "large" | "medium";
  splitMode?: "equal" | "custom";
  remaining?: number;
  isBalanced?: boolean;
  onDistribute?: () => void;
  canDistribute?: boolean;
}

export default function AmountDisplay({
  amount,
  showCursor = false,
  size = "large",
  splitMode,
  remaining = 0,
  isBalanced = false,
  onDistribute,
  canDistribute = false,
}: AmountDisplayProps) {
  const display = amount === "0" ? "0" : amount;
  const total = parseFloat(amount) || 0;
  const isLarge = size === "large";

  // Custom mode status pill (Slide 2 only)
  const showCustomStatus = splitMode === "custom";

  let statusNode: React.ReactNode = null;
  if (showCustomStatus) {
    const overBudget = remaining < -0.01;
    const unassigned = remaining > 0.01;
    const showButton = canDistribute && Math.abs(remaining) > 0.01 && total > 0;

    const chipLayout =
      "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[13px] font-semibold leading-none";

    const buttonLabel = overBudget
      ? `Remove $${Math.abs(remaining).toFixed(2)}`
      : `Distribute $${remaining.toFixed(2)} with others`;

    if (showButton) {
      statusNode = (
        <button
          type="button"
          onClick={onDistribute}
          className={`mt-1 ${chipLayout} gap-1.5 bg-primary/10 text-primary transition-transform active:scale-[0.96]`}
        >
          {buttonLabel}
          <RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        </button>
      );
    } else if (isBalanced && total > 0) {
      statusNode = null;
    } else {
      let statusText = "assign to everyone";
      let tone = "bg-muted text-muted-foreground";
      if (total === 0) {
        statusText = "assign to everyone";
      } else if (overBudget) {
        statusText = `$${Math.abs(remaining).toFixed(2)} over total`;
        tone = "bg-destructive/10 text-destructive";
      } else if (unassigned) {
        statusText = `$${remaining.toFixed(2)} left to assign`;
        tone = "bg-primary/10 text-primary";
      }
      statusNode = <span className={`mt-1 ${chipLayout} ${tone}`}>{statusText}</span>;
    }
  }

  return (
    <div className="flex flex-col items-center transition-all">
      <div className="flex items-baseline justify-center">
        <span
          className="font-bringbold mr-1 text-muted-foreground leading-none"
          style={{ fontSize: isLarge ? 34 : 24, letterSpacing: "0em" }}
        >
          $
        </span>
        <span
          className="font-bringbold text-foreground leading-none"
          style={{
            fontSize: isLarge ? 72 : 52,
            letterSpacing: "0em",
          }}
        >
          {display}
        </span>
        {showCursor && (
          <span
            className="ml-1 animate-blink rounded-full bg-primary"
            style={{
              width: 3,
              height: isLarge ? 52 : 38,
            }}
          />
        )}
      </div>
      {statusNode}
    </div>
  );
}
