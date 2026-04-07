import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Group } from "@/types";
import { Copy, Share2, Pencil, FileText, ChevronRight, RefreshCw } from "lucide-react";
import { generateJoinUrl } from "@/lib/bountt-utils";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface SettingsCardsProps {
  group: Group;
}

export default function SettingsCards({ group }: SettingsCardsProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(group.name);
  const [inviteCode, setInviteCode] = useState(group.invite_code);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { updateGroup, user } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isCreator = group.created_by === user?.id;
  const joinUrl = generateJoinUrl(inviteCode);

  const handleNameSave = async () => {
    setEditingName(false);
    if (name.trim() && name.trim() !== group.name) {
      await updateGroup(group.id, { name: name.trim() });
      toast({ title: "Group name updated" });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    toast({ title: "Link copied!" });
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: group.name, url: joinUrl });
    } else {
      const subject = encodeURIComponent(`Join ${group.name} on Bountt`);
      const body = encodeURIComponent(`Hey! Join my group on Bountt:\n\n${joinUrl}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc("regenerate_invite_code", {
        p_group_id: group.id,
      });
      if (error) throw error;
      const newCode = (data as { invite_code: string }).invite_code;
      setInviteCode(newCode);
      toast({ title: "Invite code updated" });
    } catch (err: any) {
      toast({ title: "Failed to regenerate", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
      setShowRegenConfirm(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Settings</h2>

      {/* Group Name */}
      <div className="bg-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Group Name</p>
          {isCreator && editingName ? (
            <input
              className="text-sm font-medium text-foreground bg-transparent border-b border-border outline-none w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              autoFocus
            />
          ) : (
            <p className="text-sm font-medium text-foreground">{group.name}</p>
          )}
        </div>
        {isCreator && !editingName && (
          <button onClick={() => setEditingName(true)} className="p-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Invite Link */}
      <div className="bg-card rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
        <p className="text-sm font-mono text-foreground mb-3 truncate">{inviteCode}</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-muted rounded-lg py-2 text-sm font-medium text-foreground"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-primary rounded-lg py-2 text-sm font-medium text-primary-foreground"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
        {isCreator && (
          <button
            onClick={() => setShowRegenConfirm(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-muted rounded-lg py-2 text-sm font-medium text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        )}
      </div>

      {/* Transparency section */}
      <h2 className="text-lg font-bold text-foreground mt-6">Transparency</h2>
      <button
        onClick={() => navigate(`/groups/${group.id}/activity`)}
        className="bg-card rounded-xl p-4 flex items-center gap-3 w-full text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FFF0E8" }}>
          <FileText className="w-5 h-5" style={{ color: "#D94F00" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Activity log</p>
          <p className="text-xs text-muted-foreground">Every change, visible to all members</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate invite code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate the current invite link. Anyone with the old link won't be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? "Regenerating…" : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
