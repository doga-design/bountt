import { Settings, Plus, ChevronDown, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import BalancePill from "./BalancePill";
import { getBackgroundSrc } from "@/lib/background-utils";

interface DashboardHeaderProps {
  onAddMember?: () => void;
  showBalance?: boolean;
  /** When true, hide the overlapping member stack (e.g. shown above prompt headline instead). */
  hideMemberAvatars?: boolean;
}

export default function DashboardHeader({
  onAddMember,
  showBalance = false,
  hideMemberAvatars = false,
}: DashboardHeaderProps) {
  const { currentGroup, groupMembers, user } = useApp();
  const navigate = useNavigate();
  if (!currentGroup) return null;

  const activeMembers = groupMembers.filter((m) => m.status === "active");
  const bgSrc = getBackgroundSrc(currentGroup.banner_gradient);

  return (
    <div className="relative">
      {/* Banner */}
      <div
        className={hideMemberAvatars ? "px-5 pb-4 pt-5" : "px-5 pb-10 pt-5"}
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Top row: avatars + settings */}
        <div
          className={`mb-6 flex items-center ${hideMemberAvatars ? "justify-end" : "justify-between"}`}
        >
          {!hideMemberAvatars && (
            <div className="flex items-center">
              {activeMembers.map((member, i) => {
                const isCurrentUser = member.user_id === user?.id;
                const { bg } = getAvatarColor(member);

                return (
                  <div
                    key={member.id}
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary-foreground"
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
              {onAddMember && (
                <button
                  onClick={onAddMember}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-foreground bg-primary-foreground/20"
                  style={{ marginLeft: activeMembers.length > 0 ? "-12px" : "0", zIndex: 0 }}
                  aria-label="Add member"
                >
                  <Plus className="h-4 w-4 text-primary-foreground" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <UserRound className="w-5 h-5 text-primary-foreground" />
            </button>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
              aria-label="Group settings"
              onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
            >
              <Settings className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Bottom row: group name + balance */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/groups")}
            className="flex items-center gap-1"
          >
            <h1 className="text-2xl font-bold text-primary-foreground">{currentGroup.name}</h1>
            <ChevronDown className="w-4 h-4 text-primary-foreground" />
          </button>
          {showBalance && <BalancePill />}
        </div>
      </div>
    </div>
  );
}
