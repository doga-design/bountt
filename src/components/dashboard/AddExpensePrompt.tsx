import { Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface AddExpensePromptProps {
  memberName: string;
  onAddExpense: () => void;
}

export default function AddExpensePrompt({ memberName, onAddExpense }: AddExpensePromptProps) {
  const { groupMembers, user } = useApp();
  const activeMembers = groupMembers.filter((m) => m.status === "active");

  return (
    <div className="flex flex-1 flex-col items-start justify-start px-6 pb-10 pt-10">
      <div className="mb-3 flex items-center self-start">
        {activeMembers.map((member, i) => {
          const isCurrentUser = member.user_id === user?.id;
          const { bg } = getAvatarColor(member);
          return (
            <div
              key={member.id}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-background shadow-sm ring-1 ring-border"
              style={{
                marginLeft: i > 0 ? "-12px" : "0",
                backgroundColor: isCurrentUser ? "hsl(var(--card))" : bg,
                zIndex: activeMembers.length - i,
                position: "relative",
              }}
              title={member.name}
            >
              <img
                src={getAvatarImage(member)}
                alt={member.name}
                className="h-[75%] w-[75%] object-contain"
                draggable={false}
              />
            </div>
          );
        })}
      </div>
      <h2 className="mb-2 text-left text-xl font-bold tracking-tight text-foreground leading-tight">
        Cool, you added <span className="text-primary">{memberName}</span>!
        {" "}Let's bring your group to life.
      </h2>
      <p className="text-sm text-muted-foreground text-left mb-8 font-medium">
        What's the last thing you and <span className="text-primary font-bold">{memberName}</span> paid for together?
      </p>

      <button
        onClick={onAddExpense}
        className="w-full bg-primary text-primary-foreground font-semibold rounded-full py-4 px-6 flex items-center justify-center gap-2 text-base active:scale-[0.97] transition-transform"
      >
        Contribute a shared expense
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
