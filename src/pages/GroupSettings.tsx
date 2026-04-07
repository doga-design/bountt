import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Plus } from "lucide-react";
import { GroupMember } from "@/types";
import GroupBanner from "@/components/group-settings/GroupBanner";
import MemberCardScroll from "@/components/dashboard/MemberCardScroll";
import AddMemberSheet from "@/components/group-settings/AddMemberSheet";
import MemberDetailSheet from "@/components/group-settings/MemberDetailSheet";
import SettingsCards from "@/components/group-settings/SettingsCards";
import DangerZone from "@/components/group-settings/DangerZone";
import { useToast } from "@/hooks/use-toast";

export default function GroupSettings() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const {
    userGroups,
    setCurrentGroup,
    currentGroup,
    groupMembers,
    user,
    fetchMembers,
    expenses,
    expenseSplits,
    addPlaceholderMember,
    removeMember,
    settleAndRemoveMember,
    groupsLoading,
  } = useApp();
  const { toast } = useToast();

  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) setCurrentGroup(group);
    }
  }, [groupId, userGroups]);

  useEffect(() => {
    if (groupId) fetchMembers(groupId);
  }, [groupId]);

  // Fix 8: Redirect if user is no longer a member of this group
  useEffect(() => {
    if (groupId && !groupsLoading && !userGroups.find((g) => g.id === groupId)) {
      navigate("/");
      toast({ title: "Group not found or you're no longer a member" });
    }
  }, [groupId, userGroups, groupsLoading]);

  if (!currentGroup || !groupId) return null;

  const isAdmin = currentGroup.created_by === user?.id;
  const activeMembers = groupMembers.filter((m) => m.status === "active");

  return (
    <div className="screen-container bg-background">
      {/* Back button */}
      <button
        onClick={() => navigate(`/dashboard/${groupId}`)}
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>

      <GroupBanner group={currentGroup} />

      <div className="px-0 py-6 space-y-6 pb-24">
        {/* Members section */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Members</h2>
            <span className="text-xs text-muted-foreground font-medium">
              {activeMembers.length}/6 members
            </span>
          </div>
        </div>

        <MemberCardScroll
          members={groupMembers}
          expenses={expenses}
          splits={expenseSplits}
          currentUserId={user?.id ?? ""}
          onCardClick={setSelectedMember}
          addButton={
            activeMembers.length < 6 ? (
              <button
                onClick={() => setShowAddMember(true)}
                className="min-w-[260px] flex-shrink-0 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/50 flex items-center justify-center gap-2 p-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            ) : undefined
          }
        />

        <div className="px-4 space-y-6">
          <SettingsCards group={currentGroup} />
          <DangerZone group={currentGroup} isAdmin={isAdmin} />
        </div>
      </div>

      <AddMemberSheet
        open={showAddMember}
        onOpenChange={setShowAddMember}
        groupName={currentGroup.name}
        onAdd={async (name) => {
          await addPlaceholderMember(groupId, name);
          toast({ title: `${name} added` });
        }}
      />

      <MemberDetailSheet
        open={!!selectedMember}
        onOpenChange={(o) => !o && setSelectedMember(null)}
        member={selectedMember}
        expenses={expenses}
        splits={expenseSplits}
        currentUserId={user?.id ?? ""}
        isAdmin={isAdmin}
        groupInviteCode={currentGroup.invite_code}
        onRemove={async () => {
          if (selectedMember) {
            await removeMember(selectedMember.id);
            setSelectedMember(null);
            toast({ title: `${selectedMember.name} removed` });
          }
        }}
        onSettleAndRemove={async () => {
          if (selectedMember && groupId) {
            await settleAndRemoveMember(groupId, selectedMember.id);
            setSelectedMember(null);
          }
        }}
      />
    </div>
  );
}
