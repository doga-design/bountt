import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { getGroupIconSrc } from "@/lib/group-icon-utils";
import { getBackgroundSrc } from "@/lib/background-utils";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

export default function Groups() {
  const navigate = useNavigate();
  const { userGroups, groupsLoading } = useApp();
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Redirect to empty state if no groups
  useEffect(() => {
    if (!groupsLoading && userGroups.length === 0) {
      navigate("/groups/empty", { replace: true });
    }
  }, [groupsLoading, userGroups, navigate]);

  // Fetch member counts for all groups in one query
  useEffect(() => {
    if (userGroups.length === 0) return;
    const groupIds = userGroups.map((g) => g.id);

    supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds)
      .eq("status", "active")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.group_id] = (counts[row.group_id] || 0) + 1;
        }
        setMemberCounts(counts);
      });
  }, [userGroups]);

  if (groupsLoading) {
    return (
      <div className="screen-container items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="screen-container bg-background lg:h-full lg:min-h-0 lg:max-h-none">
      <div className="component-max flex-1 px-5 pb-24 pt-8 lg:max-w-4xl lg:pb-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Your Groups</h1>

        {/* Group cards */}
        <div className="space-y-3">
          {userGroups.map((group) => {
            const bgSrc = getBackgroundSrc(group.banner_gradient);
            const count = memberCounts[group.id] ?? 0;
            return (
              <button
                key={group.id}
                onClick={() => navigate(`/dashboard/${group.id}`)}
                className="w-full text-left relative overflow-hidden"
                style={{
                  backgroundImage: `url(${bgSrc})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: "4px solid white",
                  borderRadius: "20px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minHeight: "80px",
                }}
              >
                <div className="absolute inset-0 bg-black/35 rounded-[16px]" />
                <div className="relative flex items-center justify-between px-5 py-[18px]">
                  <div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                      <img
                        src={getGroupIconSrc(group.emoji)}
                        alt=""
                        className="w-6 h-6"
                        style={{ filter: "brightness(0) invert(1)" }}
                      />
                      {group.name}
                    </div>
                    <div className="text-sm text-white/70 mt-0.5">
                      {count} {count === 1 ? "member" : "members"}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <hr className="border-border my-5" />

        {/* Create + Join buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/onboarding/group-name")}
            className="w-full bg-card text-foreground font-semibold text-base py-4"
            style={{
              border: "1.5px dashed hsl(var(--border))",
              borderRadius: "20px",
            }}
          >
            + Create a group
          </button>
          <button
            onClick={() => navigate("/join")}
            className="w-full bg-primary text-primary-foreground font-bold text-base py-4 rounded-full"
          >
            Join a group
          </button>
        </div>
      </div>
      <div className="lg:hidden">
        <BottomNav onFabPress={() => {
          const lastGroupId = localStorage.getItem("bountt_last_group_id") || userGroups[0]?.id;
          if (lastGroupId) navigate(`/dashboard/${lastGroupId}`);
        }} />
      </div>
    </div>
  );
}
