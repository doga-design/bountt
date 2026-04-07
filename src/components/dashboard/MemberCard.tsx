import { ArrowUpRight } from "lucide-react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage, MemberBalance } from "@/lib/avatar-utils";
import { formatCurrency } from "@/lib/bountt-utils";

interface MemberCardProps {
  member: GroupMember;
  balance: MemberBalance;
  isCurrentUser?: boolean;
  onClick?: () => void;
}

export default function MemberCard({ member, balance, isCurrentUser, onClick }: MemberCardProps) {
  const isPlaceholder = member.is_placeholder;
  const avatarColor = getAvatarColor(member).bg;

  const balanceText = (() => {
    if (balance.direction === "settled") return "All settled";
    if (balance.direction === "you_pay") {
      return isPlaceholder
        ? `You pay ${formatCurrency(balance.amount)}`
        : `You pay them ${formatCurrency(balance.amount)}`;
    }
    // they_pay
    return isPlaceholder
      ? `They pay ${formatCurrency(balance.amount)}`
      : `They pay you ${formatCurrency(balance.amount)}`;
  })();

  return (
    <button
      onClick={onClick}
      className={`min-w-[260px] flex-shrink-0 rounded-xl p-4 flex items-start gap-3 text-left transition-transform active:scale-[0.98] ${
        isPlaceholder ? "bg-muted" : "bg-card"
      }`}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: avatarColor }}
      >
        <img
          src={getAvatarImage(member)}
          alt={member.name}
          className="w-[75%] h-[75%] object-contain"
          draggable={false}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold text-foreground truncate ${isCurrentUser ? "font-bold" : ""}`}>
          {isCurrentUser ? "You" : member.name}
        </p>
        <p className={`text-xs mt-0.5 ${
          balance.direction === "settled"
            ? "text-muted-foreground"
            : balance.direction === "you_pay"
            ? "text-destructive"
            : "text-emerald-600"
        }`}>
          {balanceText}
        </p>
      </div>

      {/* Arrow */}
      <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
    </button>
  );
}
