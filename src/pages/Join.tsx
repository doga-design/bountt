import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";
import PlaceholderSelectDialog from "@/components/join/PlaceholderSelectDialog";
import { formatCurrency } from "@/lib/bountt-utils";
import BottomNav from "@/components/BottomNav";

interface PlaceholderWithExpenses {
  id: string;
  name: string;
  totalExpenses: number;
}

export default function Join() {
  const { inviteCode: paramCode } = useParams<{ inviteCode?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, fetchGroups, profile } = useApp();

  const [code, setCode] = useState(() => {
    const initial = paramCode ?? "";
    // Strip BNTT- prefix if present so state holds only the suffix
    return initial.toUpperCase().startsWith("BNTT-") ? initial.slice(5) : initial;
  });
  const [loading, setLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);

  // Placeholder dialog state
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);
  const [placeholders, setPlaceholders] = useState<PlaceholderWithExpenses[]>([]);
  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string; inviteCode: string } | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { state: { from: `${window.location.pathname}` } });
      return;
    }

    setLoading(true);
    try {
      // Look up group by invite code using secure RPC
      const { data: groups, error: groupError } = await supabase
        .rpc("lookup_group_by_invite", { p_invite_code: ("BNTT-" + code).toUpperCase().trim() });

      const group = groups?.[0] ?? null;

      if (groupError || !group) {
        toast({ title: "Invalid code", description: "No group found with that invite code.", variant: "destructive" });
        return;
      }

      // Check if already a member (active)
      const { data: existing } = await supabase
        .from("group_members")
        .select("id, status")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing && existing.status === "active") {
        toast({ title: "Already a member!", description: "You're already in this group." });
        navigate(`/dashboard/${group.id}`);
        return;
      }

      // If user was previously in group but left, rejoin via RPC (validates invite code server-side)
      if (existing && existing.status === "left") {
        const fullInviteCode = ("BNTT-" + code).toUpperCase().trim();
        
        const { data: activeMembersData } = await supabase
          .from("group_members")
          .select("avatar_color, avatar_index")
          .eq("group_id", group.id)
          .eq("status", "active");

        const activeColors = activeMembersData?.filter((m) => m.avatar_color).map((m) => m.avatar_color!) ?? [];
        const activeIndices = activeMembersData?.filter((m) => m.avatar_index != null).map((m) => m.avatar_index!) ?? [];

        const { pickAvailableColor } = await import("@/lib/avatar-utils");
        const { color, index } = pickAvailableColor(activeColors, activeIndices);

        const displayName = profile?.display_name ?? user!.email?.split("@")[0] ?? "Member";
        const { error: rejoinError } = await supabase.rpc("join_group", {
          p_group_id: group.id,
          p_display_name: displayName,
          p_avatar_color: color,
          p_avatar_index: index,
          p_invite_code: fullInviteCode,
        });

        if (rejoinError) throw rejoinError;

        await supabase.rpc("log_member_joined", {
          p_group_id: group.id,
          p_actor_name: displayName,
        });

        await fetchGroups(true);
        toast({ title: `Rejoined ${group.name}!`, description: "Welcome back" });
        navigate(`/dashboard/${group.id}`);
        return;
      }

      // Fetch placeholders for this group via scoped RPC
      const { data: placeholderData } = await supabase
        .rpc("get_placeholders_for_join", { p_group_id: group.id });

      if (placeholderData && placeholderData.length > 0) {
        const withExpenses: PlaceholderWithExpenses[] = placeholderData.map((ph) => ({
          id: ph.id,
          name: ph.name,
          totalExpenses: Number(ph.total_expenses),
        }));

        const fullInviteCode = ("BNTT-" + code).toUpperCase().trim();
        setPendingGroup({ id: group.id, name: group.name, inviteCode: fullInviteCode });
        setPlaceholders(withExpenses);
        setShowPlaceholderDialog(true);
        return;
      }

      // No placeholders — join as new member directly
      await joinAsNewMember(group.id, group.name, ("BNTT-" + code).toUpperCase().trim());
    } catch (err) {
      toast({ title: "Failed to join", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const joinAsNewMember = async (groupId: string, groupName: string, inviteCode?: string) => {
    const { data: existingMembers } = await supabase
      .from("group_members")
      .select("avatar_color, avatar_index")
      .eq("group_id", groupId)
      .eq("status", "active");

    // Check 6-member limit
    if ((existingMembers?.length ?? 0) >= 6) {
      toast({ title: "This group is full (6/6 members)" });
      return;
    }

    const existingColors = existingMembers?.filter((m) => m.avatar_color).map((m) => m.avatar_color!) ?? [];
    const existingIndices = existingMembers?.filter((m) => m.avatar_index != null).map((m) => m.avatar_index!) ?? [];

    const { pickAvailableColor } = await import("@/lib/avatar-utils");
    const { color: newColor, index: newIndex } = pickAvailableColor(existingColors, existingIndices);

    const displayName = profile?.display_name ?? user!.email?.split("@")[0] ?? "Member";
    const resolvedCode = inviteCode ?? pendingGroup?.inviteCode ?? "";
    const { error: joinError } = await supabase.rpc("join_group", {
      p_group_id: groupId,
      p_display_name: displayName,
      p_avatar_color: newColor,
      p_avatar_index: newIndex,
      p_invite_code: resolvedCode,
    });

    if (joinError) throw joinError;

    // Log member joined activity
    await supabase.rpc("log_member_joined", {
      p_group_id: groupId,
      p_actor_name: displayName,
    });

    await fetchGroups(true);
    toast({ title: `Joined ${groupName}!`, description: "Welcome to the group" });
    navigate(`/dashboard/${groupId}`);
  };

  const handlePlaceholderSelection = async (placeholderId: string | null) => {
    if (!pendingGroup) return;
    setMergeLoading(true);

    try {
      if (placeholderId) {
        // Merge with placeholder using RPC
        const { error } = await supabase.rpc("claim_placeholder", {
          p_placeholder_id: placeholderId,
          p_invite_code: pendingGroup.inviteCode,
        });

        if (error) throw error;

        const selected = placeholders.find((p) => p.id === placeholderId);
        await fetchGroups(true);

        // Log member joined activity (placeholder claim)
        const memberName = profile?.display_name ?? user!.email?.split("@")[0] ?? "Member";
        await supabase.rpc("log_member_joined", {
          p_group_id: pendingGroup.id,
          p_actor_name: memberName,
        });

        toast({
          title: `Joined ${pendingGroup.name}!`,
          description: `Merged with ${selected?.name}'s expenses`,
        });
        navigate(`/dashboard/${pendingGroup.id}`);
      } else {
        // Join as new member
        await joinAsNewMember(pendingGroup.id, pendingGroup.name);
      }
    } catch (err) {
      toast({
        title: "Failed to join",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMergeLoading(false);
      setShowPlaceholderDialog(false);
    }
  };

  return (
    <div className="screen-container bg-background items-center justify-center">
      <div className="w-full px-6 pb-24">
        <div className="text-center mb-8">
          <h1 className="bountt-wordmark text-4xl text-foreground mb-2">
            bountt<span className="text-primary">.</span>
          </h1>
          <div className="bg-secondary text-secondary-foreground rounded-full px-5 py-2 text-sm font-bold inline-block">
            Join a group
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm">
            <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
              Group Invite Code
            </label>
            <div className="flex items-center">
              <span className="text-base font-mono text-muted-foreground select-none">BNTT-</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                placeholder="XXXX"
                maxLength={4}
                className="flex-1 text-base font-mono text-foreground bg-transparent outline-none placeholder:text-muted-foreground uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full bg-primary text-primary-foreground rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Join Group →
          </button>
        </form>
      </div>

      <PlaceholderSelectDialog
        open={showPlaceholderDialog}
        onOpenChange={setShowPlaceholderDialog}
        placeholders={placeholders}
        onSelect={handlePlaceholderSelection}
        loading={mergeLoading}
      />
      <BottomNav onFabPress={() => {
        const lastGroupId = localStorage.getItem("bountt_last_group_id");
        if (lastGroupId) navigate(`/dashboard/${lastGroupId}`);
      }} />
    </div>
  );
}
