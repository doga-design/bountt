import { Expense, ExpenseSplit, GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { useApp } from "@/contexts/AppContext";
import { formatAmount } from "@/lib/bountt-utils";

interface ExpenseFeedItemProps {
  expense: Expense;
  splits: ExpenseSplit[];
  groupMembers: GroupMember[];
  onClick?: () => void;
}

/** Single avatar circle */
function Avatar({
  member,
  size = 56,
  className = "",
}: {
  member: GroupMember | null;
  size?: number;
  className?: string;
}) {
  const bg = member ? getAvatarColor(member).bg : '#DFDFDF';
  const img = member ? getAvatarImage(member) : null;
  return (
    <div
      className={`rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      {img && (
        <img
          src={img}
          alt=""
          className="object-contain"
          style={{ width: size * 0.75, height: size * 0.75 }}
        />
      )}
    </div>
  );
}

/** Stacked avatar group — max 2 visible + "+N" */
function StackedAvatars({
  members,
  size = 28,
}: {
  members: GroupMember[];
  size?: number;
}) {
  const visible = members.slice(0, 2);
  const overflow = members.length - 2;
  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div
          key={m.id}
          className="rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-background"
          style={{
            width: size,
            height: size,
            backgroundColor: getAvatarColor(m).bg,
            marginLeft: i > 0 ? -8 : 0,
            zIndex: i + 1,
          }}
        >
          <img
            src={getAvatarImage(m)}
            alt=""
            className="object-contain"
            style={{ width: size * 0.75, height: size * 0.75 }}
          />
        </div>
      ))}
      {overflow > 0 && (
        <span className="text-sm text-muted-foreground ml-1 font-medium">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default function ExpenseFeedItem({
  expense,
  splits,
  groupMembers,
  onClick,
}: ExpenseFeedItemProps) {
  const { user } = useApp();
  const currentUserId = user?.id ?? "";

  // --- Derive payer member ---
  const payerMember =
    groupMembers.find(
      (m) =>
        (expense.paid_by_user_id && m.user_id === expense.paid_by_user_id) ||
        (!expense.paid_by_user_id &&
          m.name === expense.paid_by_name &&
          m.is_placeholder)
    ) ?? null;

  const isPayer = expense.paid_by_user_id === currentUserId;
  const selfMember = groupMembers.find((m) => m.user_id === currentUserId);
  const payerName = isPayer ? "You" : expense.paid_by_name;

  // --- My split ---
  const mySplit = splits.find((s) => s.user_id === currentUserId) ?? null;
  const isInvolved = isPayer || !!mySplit;

  // --- Cover detection via expense_type ---
  const isCover = expense.expense_type === "cover";

  // --- Non-payer splits (defensive filter — payer should have no split row) ---
  const nonPayerSplits = splits.filter(
    (s) =>
      !(
        (expense.paid_by_user_id && s.user_id === expense.paid_by_user_id) ||
        (!expense.paid_by_user_id &&
          s.member_name === expense.paid_by_name &&
          !s.user_id)
      )
  );
  const unsettledNonPayerSplits = nonPayerSplits.filter((s) => !s.is_settled);
  const allSettled =
    expense.is_settled ||
    (nonPayerSplits.length > 0 && unsettledNonPayerSplits.length === 0);

  // --- Solo check (payer has no split row, so solo = 0 splits) ---
  const isSolo = isPayer && splits.length === 0;

  // --- Amounts ---
  const totalOwedToMe = unsettledNonPayerSplits.reduce(
    (sum, s) => sum + Number(s.share_amount),
    0
  );
  const myRemaining =
    mySplit && !mySplit.is_settled ? Number(mySplit.share_amount) : 0;

  // --- Determine label, displayAmount, showTotal, right avatars, muted ---
  let label = "";
  let displayAmount = 0;
  let showTotal = true;
  let rightAvatarMembers: GroupMember[] = [];
  let isMuted = false;

  if (!isPayer) {
    // Someone else paid
    if (!isInvolved) {
      label = "Not involved";
      const perPerson =
        splits.length > 0 ? expense.amount / splits.length : 0;
      displayAmount = perPerson;
      // Show $0.00 style for not-involved
      isMuted = true;
      if (payerMember) rightAvatarMembers = [payerMember];
    } else if (mySplit?.is_settled || allSettled) {
      label = "You're square";
      displayAmount = 0;
      isMuted = true;
      if (payerMember) rightAvatarMembers = [payerMember];
    } else if (isCover) {
      // Covered me — full amount, no /total
      label = `You pay ${expense.paid_by_name}`;
      displayAmount = myRemaining;
      showTotal = false;
      if (payerMember) rightAvatarMembers = [payerMember];
    } else {
      label = `You pay ${expense.paid_by_name}`;
      displayAmount = myRemaining;
      if (payerMember) rightAvatarMembers = [payerMember];
    }
  } else {
    // I paid
    if (isSolo) {
      label = "Just you";
      displayAmount = expense.amount;
      showTotal = false;
      isMuted = true;
    } else if (allSettled) {
      label = "All square";
      displayAmount = 0;
      isMuted = true;
    } else if (nonPayerSplits.length === 1) {
      const theSplit = nonPayerSplits[0];
      const oweeMember = groupMembers.find(
        (m) =>
          (theSplit.user_id && m.user_id === theSplit.user_id) ||
          (!theSplit.user_id &&
            m.name === theSplit.member_name &&
            m.is_placeholder)
      );
      if (isCover) {
        label = `${theSplit.member_name} pays you`;
        displayAmount = theSplit.is_settled
          ? 0
          : Number(theSplit.share_amount);
        showTotal = false;
      } else {
        label = `${theSplit.member_name} pays you`;
        displayAmount = theSplit.is_settled
          ? 0
          : Number(theSplit.share_amount);
      }
      if (oweeMember) rightAvatarMembers = [oweeMember];
      if (theSplit.is_settled) isMuted = true;
    } else {
      // Multiple owe me
      label = "They pay you";
      displayAmount = totalOwedToMe;
      // Collect owee members
      rightAvatarMembers = nonPayerSplits
        .filter((s) => !s.is_settled)
        .map((s) =>
          groupMembers.find(
            (m) =>
              (s.user_id && m.user_id === s.user_id) ||
              (!s.user_id && m.name === s.member_name && m.is_placeholder)
          )
        )
        .filter(Boolean) as GroupMember[];
    }
  }

  // --- Amount text ---
  const amountText = `$${formatAmount(displayAmount)}`;
  const totalText = showTotal ? `/$${formatAmount(expense.amount)}` : "";
  const mutedClass = isMuted ? "opacity-60 grayscale" : "";

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 py-5 cursor-pointer active:opacity-80 transition-opacity"
    >
      {/* LEFT: payer avatar + info */}
      <div className={`flex items-start gap-3 flex-1 min-w-0 ${mutedClass}`}>
        <Avatar member={payerMember} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            <span className={`font-medium text-foreground ${isPayer ? "font-bold" : ""}`}>
              {payerName}
            </span>
            <span className="ml-1">paid ${formatAmount(expense.amount)}</span>
          </p>
          <p className="font-bold text-base text-foreground truncate max-w-[210px]">
            {expense.description}
          </p>
        </div>
      </div>

      {/* RIGHT: label + avatars + amount */}
      <div
        className={`flex flex-col items-end flex-shrink-0 max-w-[140px] ${mutedClass}`}
      >
        <span className="text-sm text-muted-foreground font-normal mb-1 text-right leading-tight">
          {label}
        </span>
        <div className="mb-1 flex items-baseline justify-end gap-0">
          <span className="font-bold text-base text-foreground">{amountText}</span>
          {totalText && (
            <span className="text-sm text-muted-foreground font-normal">{totalText}</span>
          )}
        </div>
        {rightAvatarMembers.length > 0 && (
          <div>
            <StackedAvatars members={rightAvatarMembers} size={28} />
          </div>
        )}
      </div>
    </div>
  );
}
