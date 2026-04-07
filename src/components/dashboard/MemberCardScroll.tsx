import { GroupMember, Expense, ExpenseSplit } from "@/types";
import { getMemberBalance } from "@/lib/avatar-utils";
import MemberCard from "./MemberCard";

interface MemberCardScrollProps {
  members: GroupMember[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  currentUserId: string;
  onCardClick?: (member: GroupMember) => void;
  addButton?: React.ReactNode;
}

export default function MemberCardScroll({
  members,
  expenses,
  splits,
  currentUserId,
  onCardClick,
  addButton,
}: MemberCardScrollProps) {
  // Filter out current user and left members
  const visibleMembers = members.filter(
    (m) => m.user_id !== currentUserId && m.status === "active"
  );

  return (
    <div className="overflow-x-auto chip-scroll">
      <div className="flex gap-3 px-4 py-2">
        {visibleMembers.map((member) => {
          const balance = getMemberBalance(
            member.id,
            member.user_id,
            member.name,
            expenses,
            splits,
            currentUserId
          );
          return (
            <MemberCard
              key={member.id}
              member={member}
              balance={balance}
              onClick={() => onCardClick?.(member)}
            />
          );
        })}
        {addButton}
      </div>
    </div>
  );
}
