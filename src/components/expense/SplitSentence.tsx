import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface SplitSentenceProps {
  splitMode: "equal" | "custom";
  onToggleMode: () => void;
  selectedMembers: GroupMember[];
  currentUserId: string | undefined;
  payerMember: GroupMember | undefined;
  onSetPayer: (memberId: string) => void;
  allActiveMembers: GroupMember[];
  hidePayerDrawer?: boolean;
  payerDrawerOpen: boolean;
  onPayerDrawerChange: (open: boolean) => void;
}

export default function SplitSentence({
  splitMode,
  onToggleMode,
  selectedMembers,
  currentUserId,
  payerMember,
  onSetPayer,
  allActiveMembers,
  hidePayerDrawer = false,
  payerDrawerOpen,
  onPayerDrawerChange,
}: SplitSentenceProps) {

  const payerIsYou = payerMember?.user_id === currentUserId;
  const payerDisplay = payerIsYou ? "You" : payerMember?.name ?? "You";

  const isEqual = splitMode === "equal";

  // Names: everyone in selectedMembers except the payer
  const others = selectedMembers.filter((m) => m.id !== payerMember?.id);

  const renderName = (member: GroupMember) => {
    const isYou = member.user_id === currentUserId;
    const label = isYou ? "you" : member.name;
    return (
      <span key={member.id} className="font-bold text-foreground">
        {label}
      </span>
    );
  };

  let namesDisplay: React.ReactNode;
  if (others.length === 0) {
    namesDisplay = <span className="font-bold text-foreground">No one</span>;
  } else if (others.length === 1) {
    namesDisplay = renderName(others[0]);
  } else if (others.length === 2) {
    namesDisplay = (
      <>
        {renderName(others[0])}
        {" & "}
        {renderName(others[1])}
      </>
    );
  } else {
    namesDisplay = (
      <>
        {others.slice(0, -1).map((m, i) => (
          <span key={m.id}>
            {renderName(m)}
            {i < others.length - 2 ? ", " : ""}
          </span>
        ))}
        {" & "}
        {renderName(others[others.length - 1])}
      </>
    );
  }

  return (
    <>
      <p
        className={cn(
          "mx-auto max-w-[300px] px-6 text-center text-lg font-semibold leading-tight text-muted-foreground",
          splitMode === "custom" ? "mb-2" : "mb-6",
        )}
      >
        <button
          onClick={() => {
            if (hidePayerDrawer) return;
            onPayerDrawerChange(true);
          }}
          className={`font-extrabold underline decoration-dotted underline-offset-4 text-primary ${payerIsYou ? "font-bold" : ""}`}
        >
          {payerDisplay}
        </button>
        {" paid, splitting "}
        <button
          onClick={onToggleMode}
          className="font-extrabold text-primary underline decoration-dotted underline-offset-4"
        >
          {isEqual ? "equally" : "custom"}
        </button>{" "}
        with {namesDisplay}
      </p>

      {/* Payer selection drawer */}
      <Drawer open={payerDrawerOpen} onOpenChange={onPayerDrawerChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-sans">Who paid?</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {allActiveMembers.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const label = isSelf ? "You" : m.name;
              const isSelected = m.id === payerMember?.id;
              const avatarImg = getAvatarImage(m);
              const { bg: color } = getAvatarColor(m);

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    onSetPayer(m.id);
                    onPayerDrawerChange(false);
                  }}
                  className="flex items-center justify-between w-full rounded-xl px-4 py-3 transition-colors active:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: color }}
                    >
                      <img src={avatarImg} alt={label} className="w-[75%] h-[75%] object-contain" draggable={false} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
