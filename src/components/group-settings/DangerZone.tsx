import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Group } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { LogOut, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAvatarImage, getAvatarColor } from "@/lib/avatar-utils";
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

interface DangerZoneProps {
  group: Group;
  isAdmin: boolean;
}

export default function DangerZone({ group, isAdmin }: DangerZoneProps) {
  const [showLeave, setShowLeave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSuccessor, setSelectedSuccessor] = useState<string | null>(null);
  const { leaveGroup, deleteGroup, transferOwnership, groupMembers, user, expenses } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for unsettled balances
  const hasUnsettledBalances = useMemo(() => {
    const groupExpenses = expenses.filter((e) => e.group_id === group.id && !e.is_settled);
    return groupExpenses.length > 0;
  }, [expenses, group.id]);

  // Check if user is sole admin
  const isSoleAdmin = isAdmin && groupMembers.filter(
    (m) => m.group_id === group.id && m.role === "admin" && m.status === "active"
  ).length <= 1;

  // Eligible members for ownership transfer (active, non-placeholder, not self)
  const eligibleMembers = useMemo(() => {
    return groupMembers.filter(
      (m) =>
        m.group_id === group.id &&
        m.status === "active" &&
        !m.is_placeholder &&
        m.user_id !== user?.id
    );
  }, [groupMembers, group.id, user?.id]);

  const handleLeaveClick = () => {
    if (isSoleAdmin) {
      if (eligibleMembers.length > 0) {
        setSelectedSuccessor(null);
        setShowTransfer(true);
      } else {
        toast({
          title: "You're the only real member. Delete the group instead.",
          variant: "destructive",
        });
      }
    } else {
      setShowLeave(true);
    }
  };

  const handleLeave = async () => {
    setLeaveLoading(true);
    await leaveGroup(group.id);
    setLeaveLoading(false);
    navigate("/");
  };

  const handleTransferAndLeave = async () => {
    if (!selectedSuccessor) return;
    setLeaveLoading(true);
    try {
      await transferOwnership(group.id, selectedSuccessor);
      await leaveGroup(group.id);
      navigate("/");
    } catch {
      // transferOwnership already shows a toast on error
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== group.name) return;
    setDeleteLoading(true);
    await deleteGroup(group.id);
    setDeleteLoading(false);
    navigate("/");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>

      <button
        onClick={handleLeaveClick}
        className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left"
      >
        <LogOut className="w-5 h-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-foreground">Leave Group</p>
          <p className="text-xs text-muted-foreground">
            {isSoleAdmin && eligibleMembers.length === 0
              ? "Delete the group to leave"
              : isSoleAdmin
                ? "Transfer admin to another member first"
                : "You'll lose access to expenses"}
          </p>
        </div>
      </button>

      {isAdmin && (
        <button
          onClick={() => setShowDelete(true)}
          className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left"
        >
          <Trash2 className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Delete Group</p>
            <p className="text-xs text-muted-foreground">All expenses will be permanently lost</p>
          </div>
        </button>
      )}

      {/* Leave dialog (non-sole-admin path) */}
      <AlertDialog open={showLeave} onOpenChange={setShowLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {group.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose access to all shared expenses in this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeave}
              disabled={leaveLoading}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              {leaveLoading ? "Leaving…" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer admin dialog (sole-admin path) */}
      <AlertDialog open={showTransfer} onOpenChange={setShowTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer admin before leaving</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a member to take over as group admin. You'll leave the group after transferring.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {eligibleMembers.map((member) => {
              const avatarImg = getAvatarImage(member);
              const avatarColor = getAvatarColor(member);
              const isSelected = selectedSuccessor === member.user_id;

              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedSuccessor(member.user_id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: avatarColor.bg }}
                  >
                    <img src={avatarImg} alt={member.name} className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1 text-left truncate">
                    {member.name}
                  </span>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedSuccessor(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferAndLeave}
              disabled={!selectedSuccessor || leaveLoading}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              {leaveLoading ? "Transferring…" : "Transfer & Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsettledBalances
                ? "⚠️ This group has unsettled balances. Deleting it means all debts will be lost. This action cannot be undone. Type the group name to confirm."
                : "This action cannot be undone. Type the group name to confirm."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-destructive"
            placeholder={group.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={confirmName !== group.name || deleteLoading}
              className="bg-destructive text-destructive-foreground disabled:opacity-50"
            >
              {deleteLoading ? "Deleting…" : "Delete Group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
