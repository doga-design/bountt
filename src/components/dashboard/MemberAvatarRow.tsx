import { useState, useRef, useEffect } from "react";
import { PieChart } from "lucide-react";
import { GroupMember } from "@/types";
import { getAvatarImage, getAvatarColor } from "@/lib/avatar-utils";
import { useToast } from "@/hooks/use-toast";
import { PlaceholderGhostIcon } from "./PlaceholderGhostIcon";

interface MemberAvatarRowProps {
  members: GroupMember[];
  currentUserId: string;
  groupInviteCode?: string;
  onFilterMember?: (memberId: string | null) => void;
}

export default function MemberAvatarRow({
  members,
  currentUserId,
  groupInviteCode,
  onFilterMember,
}: MemberAvatarRowProps) {
  const { toast } = useToast();

  const activeMembers = members.filter((m) => m.status === "active");

  // Sort: current user first → real members → placeholders
  const sorted = [...activeMembers].sort((a, b) => {
    const aIsMe = a.user_id === currentUserId;
    const bIsMe = b.user_id === currentUserId;
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    if (a.is_placeholder !== b.is_placeholder) return a.is_placeholder ? 1 : -1;
    return 0;
  });

  const currentUserMember = sorted.find((m) => m.user_id === currentUserId);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [inviteCardMemberId, setInviteCardMemberId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-away dismissal
  useEffect(() => {
    if (!inviteCardMemberId) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setInviteCardMemberId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [inviteCardMemberId]);

  const handleTap = (member: GroupMember) => {
    // Toggle invite card for placeholders (secondary behavior)
    if (member.is_placeholder) {
      setInviteCardMemberId((prev) => (prev === member.id ? null : member.id));
    } else {
      setInviteCardMemberId(null);
    }
    // Toggle filter for all members (placeholder or real)
    if (selectedMemberId === member.id) {
      setSelectedMemberId(null);
      onFilterMember?.(null);
    } else {
      setSelectedMemberId(member.id);
      onFilterMember?.(member.id);
    }
  };

  const handleInvite = async (name: string) => {
    if (!groupInviteCode) return;
    const link = `${window.location.origin}/join/${groupInviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Invite link copied!" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const inviteMember = inviteCardMemberId
    ? sorted.find((m) => m.id === inviteCardMemberId)
    : null;

  return (
    <div ref={containerRef} className="px-4">
      <p className="text-[12px] font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
        All Members
      </p>

      {/* Scrollable avatar row */}
      <div className="overflow-x-auto -mx-4 px-4 chip-scroll">
        <div className="flex gap-4 items-start">
          {sorted.map((member) => {
            const isSelected = selectedMemberId === member.id;
            const isMe = member.user_id === currentUserId;
            const avatarImg = getAvatarImage(member);
            const { bg: bgColor, stroke: strokeColor } = getAvatarColor(member);

            return (
              <button
                key={member.id}
                onClick={() => handleTap(member)}
                className="flex flex-col items-center gap-1.5 shrink-0 min-w-0 transition-opacity duration-200"
                style={{ width: 52, opacity: selectedMemberId && !isSelected ? 0.4 : 1 }}
              >
                {/* Avatar circle */}
                <div className="relative">
                  <div
                    className="rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                      width: 48,
                      height: 48,
                      backgroundColor: bgColor,
                      border: isSelected ? `2.5px solid ${strokeColor}` : "2.5px solid #FFFFFF",
                    }}
                  >
                    <img
                      src={avatarImg}
                      alt={member.name}
                      className="w-9 h-9 object-contain"
                      draggable={false}
                    />
                  </div>

                  {/* Status badge */}
                  {member.is_placeholder ? (
                    <span
                      className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground shadow-sm"
                      aria-label="Placeholder member"
                    >
                      <PlaceholderGhostIcon className="h-[15px] w-[13px]" />
                    </span>
                  ) : (
                    <span
                      className="absolute top-0 right-0 block rounded-full border-2 border-background"
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: "#22C55E",
                      }}
                    />
                  )}
                </div>

                {/* Name */}
                <span
                  className={`text-[12px] font-medium text-foreground truncate w-full text-center leading-tight ${isMe ? "font-bold" : ""}`}
                >
                  {isMe ? "You" : member.name}
                </span>
              </button>
            );
          })}

          {/* Pie chart placeholder icon */}
          <div
            className="flex flex-col items-center gap-1.5 shrink-0 pointer-events-none"
            style={{ width: 52, opacity: 0.4 }}
          >
            <div
              className="rounded-full flex items-center justify-center border-2 border-muted"
              style={{ width: 48, height: 48 }}
            >
              <PieChart className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-[12px] font-medium text-muted-foreground text-center leading-tight">
              Stats
            </span>
          </div>
        </div>
      </div>

      {/* Inline invite card (slide-down) */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: inviteMember ? 140 : 0,
          opacity: inviteMember ? 1 : 0,
        }}
      >
        {inviteMember && (
          <div className="mt-3 rounded-2xl bg-muted/60 border border-border p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-11 shrink-0 items-center justify-center text-foreground">
                <PlaceholderGhostIcon className="h-12 w-10" />
              </span>
              <p className="text-sm text-foreground leading-snug">
                <span className="font-semibold text-foreground">
                  {inviteMember.name}
                </span>{" "}
                is still a placeholder, try inviting them for the best experience!
              </p>
            </div>
            <button
              onClick={() => handleInvite(inviteMember.name)}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: "#1E293B" }}
            >
              Invite {inviteMember.name} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
