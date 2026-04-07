import { useState } from "react";
import { Send, Pencil, Trash2, ArrowRight, HandCoins } from "lucide-react";
import { GroupMember, Expense, ExpenseSplit } from "@/types";
import { getAvatarColor, getAvatarImage, getMemberBalance } from "@/lib/avatar-utils";
import { formatCurrency, generateJoinUrl } from "@/lib/bountt-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MemberDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: GroupMember | null;
  expenses: Expense[];
  splits: ExpenseSplit[];
  currentUserId: string;
  isAdmin: boolean;
  onRemove?: () => void;
  onSettleAndRemove?: () => void;
  groupInviteCode?: string;
}

export default function MemberDetailSheet({
  open,
  onOpenChange,
  member,
  expenses,
  splits,
  currentUserId,
  isAdmin,
  onRemove,
  onSettleAndRemove,
  groupInviteCode,
}: MemberDetailSheetProps) {
  const { toast } = useToast();
  const [confirmType, setConfirmType] = useState<"simple" | "unsettled" | null>(null);

  if (!member) return null;

  const isPlaceholder = member.is_placeholder;
  const avatarColor = getAvatarColor(member).bg;
  const balance = getMemberBalance(
    member.id,
    member.user_id,
    member.name,
    expenses,
    splits,
    currentUserId
  );

  // Check for unsettled splits
  const hasUnsettledSplits = splits.some(
    (s) =>
      !s.is_settled &&
      ((member.user_id && s.user_id === member.user_id) ||
        (!member.user_id && s.member_name === member.name && !s.user_id))
  );

  // Get shared expenses
  const sharedExpenses = expenses.filter((exp) => {
    if (exp.is_settled) return false;
    const hasSplit = splits.some(
      (s) =>
        s.expense_id === exp.id &&
        ((member.user_id && s.user_id === member.user_id) ||
          (!member.user_id && s.member_name === member.name && !s.user_id))
    );
    return hasSplit;
  });

  const balanceText = (() => {
    if (balance.direction === "settled") return "All settled up";
    if (balance.direction === "you_pay") return `You owe ${member.name}`;
    return `${member.name} owes you`;
  })();

  const handleRemoveClick = () => {
    if (hasUnsettledSplits) {
      setConfirmType("unsettled");
    } else {
      setConfirmType("simple");
    }
  };

  const handleConfirmRemove = () => {
    setConfirmType(null);
    onRemove?.();
  };

  const handleSettleAndRemove = () => {
    setConfirmType(null);
    onSettleAndRemove?.();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                <img
                  src={getAvatarImage(member)}
                  alt={member.name}
                  className="w-[75%] h-[75%] object-contain"
                  draggable={false}
                />
              </div>
              <div>
                <DrawerTitle>{member.name}</DrawerTitle>
                <div className="flex items-center gap-2 mt-1">
                  {isPlaceholder ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Not on Bountt yet
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Active
                      </span>
                      {member.role === "admin" && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Admin
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-5">
            {/* Balance summary */}
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{balanceText}</p>
              <p className={`text-2xl font-bold ${
                balance.direction === "settled"
                  ? "text-muted-foreground"
                  : balance.direction === "you_pay"
                  ? "text-destructive"
                  : "text-emerald-600"
              }`}>
                {balance.direction === "settled" ? "—" : formatCurrency(balance.amount)}
              </p>
            </div>

            {/* Shared expenses list */}
            {sharedExpenses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Shared expenses
                </p>
                <div className="space-y-2">
                  {sharedExpenses.slice(0, 5).map((exp) => {
                    const split = splits.find(
                      (s) =>
                        s.expense_id === exp.id &&
                        ((member.user_id && s.user_id === member.user_id) ||
                          (!member.user_id && s.member_name === member.name && !s.user_id))
                    );
                    return (
                      <div key={exp.id} className="flex items-center justify-between bg-card rounded-lg p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{exp.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.paid_by_name} paid {formatCurrency(exp.amount)}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {split ? formatCurrency(split.share_amount) : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {isPlaceholder ? (
                <>
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={async () => {
                      if (!groupInviteCode) return;
                      const url = generateJoinUrl(groupInviteCode);
                      await navigator.clipboard.writeText(url);
                      toast({ title: `Invite link copied!`, description: `Share it with ${member.name} — they'll be able to merge with their placeholder when they join.` });
                    }}
                  >
                    <Send className="w-4 h-4" /> Invite to Bountt
                  </Button>
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <Pencil className="w-4 h-4" /> Edit Name
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <ArrowRight className="w-4 h-4" /> View Shared Expenses
                  </Button>
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    <HandCoins className="w-4 h-4" /> Settle Up
                  </Button>
                </>
              )}
              {isAdmin && member.user_id !== currentUserId && (
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  size="lg"
                  onClick={handleRemoveClick}
                >
                  <Trash2 className="w-4 h-4" /> Remove from Group
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Simple removal confirmation */}
      <AlertDialog open={confirmType === "simple"} onOpenChange={(o) => !o && setConfirmType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll lose access to expenses in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsettled splits confirmation */}
      <AlertDialog open={confirmType === "unsettled"} onOpenChange={(o) => !o && setConfirmType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsettled costs</AlertDialogTitle>
            <AlertDialogDescription>
              {member.name} still has unsettled costs in this group. Settle everything before they leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Remove anyway
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSettleAndRemove}>
              Yes, settle all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
