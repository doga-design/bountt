import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus, FileText, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/bountt-utils";

interface ActivityLogEntry {
  id: string;
  group_id: string;
  actor_id: string;
  actor_name: string;
  action_type: "added" | "edited" | "deleted" | "joined" | "settled";
  expense_snapshot: {
    expense_id: string;
    description: string;
    amount: number;
    paid_by_name: string;
    member_names: string[];
  } | null;
  change_detail: Array<{
    field: string;
    old_value: string;
    new_value: string;
  }> | null;
  created_at: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays <= 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}

const ACTION_CONFIG = {
  added: { icon: Plus, bg: "bg-emerald-500", pillBg: "bg-emerald-50", pillText: "text-emerald-700" },
  edited: { icon: Pencil, bg: "bg-blue-500", pillBg: "bg-blue-50", pillText: "text-blue-700" },
  deleted: { icon: Trash2, bg: "bg-red-500", pillBg: "bg-red-50", pillText: "text-red-700" },
  joined: { icon: UserPlus, bg: "bg-orange-500", pillBg: "", pillText: "" },
  settled: { icon: Check, bg: "bg-emerald-500", pillBg: "bg-emerald-50", pillText: "text-emerald-700" },
};

function ActivityCard({ entry, currentUserId }: { entry: ActivityLogEntry; currentUserId: string | undefined }) {
  const config = ACTION_CONFIG[entry.action_type];
  const Icon = config.icon;
  const actorLabel = entry.actor_id === currentUserId ? "You" : entry.actor_name;

  // Build detail pills
  const pills: React.ReactNode[] = [];

  if (entry.action_type === "added" && entry.expense_snapshot?.member_names) {
    const names = entry.expense_snapshot.member_names
      .map((n) => (n === entry.actor_name && entry.actor_id === currentUserId ? "You" : n))
      .join(" & ");
    pills.push(
      <span key="added" className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.pillBg} ${config.pillText} font-medium`}>
        split with {names}
      </span>
    );
  }

  if (entry.action_type === "deleted" && entry.expense_snapshot?.member_names) {
    const names = entry.expense_snapshot.member_names
      .map((n) => (n === entry.actor_name && entry.actor_id === currentUserId ? "You" : n))
      .join(" & ");
    pills.push(
      <span key="deleted" className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.pillBg} ${config.pillText} font-medium`}>
        was split with {names}
      </span>
    );
  }

  if (entry.action_type === "edited" && entry.change_detail) {
    entry.change_detail.forEach((change, i) => {
      let text = "";
      if (change.field === "amount") {
        text = `amount $${change.old_value} → $${change.new_value}`;
      } else if (change.field === "description") {
        text = `"${change.old_value}" → "${change.new_value}"`;
      } else if (change.field === "members") {
        if (change.old_value === "added") {
          text = `added ${change.new_value} to split`;
        } else if (change.new_value === "removed") {
          text = `removed ${change.old_value} from split`;
        }
      }
      if (text) {
        pills.push(
          <span key={i} className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.pillBg} ${config.pillText} font-medium`}>
            {text}
          </span>
        );
      }
    });
  }

  if (entry.action_type === "settled" && entry.change_detail) {
    const isSettleAll = entry.change_detail[0]?.field === "settled_all";
    const isSettleMember = entry.change_detail[0]?.field === "settled_member";
    const text = isSettleAll
      ? `settled for everyone`
      : isSettleMember
      ? `settled ${entry.change_detail[0].new_value}'s share`
      : `settled their share`;
    pills.push(
      <span key="settled" className={`inline-block text-xs px-2 py-0.5 rounded-full ${config.pillBg} ${config.pillText} font-medium`}>
        {text}
      </span>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className={`${entry.actor_id === currentUserId ? "font-bold" : "font-bold"} text-foreground`}>{actorLabel}</span>
          {" "}
          {entry.action_type === "joined" ? (
            <span className="text-muted-foreground">joined the group</span>
          ) : entry.action_type === "settled" ? (
            <>
              <span className="text-muted-foreground">
                {entry.change_detail?.[0]?.field === "settled_all"
                  ? "settled "
                  : entry.change_detail?.[0]?.field === "settled_member"
                  ? `settled ${entry.change_detail[0].new_value}'s share of `
                  : "settled their share of "}
              </span>
              {entry.expense_snapshot && (
                <>
                  <span className="font-bold text-foreground">"{entry.expense_snapshot.description}"</span>
                  {entry.change_detail?.[0]?.field === "settled_all" && (
                    <>
                      <span className="text-muted-foreground"> for everyone</span>
                    </>
                  )}
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(entry.expense_snapshot.amount)}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{entry.action_type} </span>
              {entry.expense_snapshot && (
                <>
                  <span className="font-bold text-foreground">"{entry.expense_snapshot.description}"</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(entry.expense_snapshot.amount)}
                  </span>
                </>
              )}
            </>
          )}
        </p>
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {pills}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
        {formatTimeAgo(entry.created_at)}
      </span>
    </div>
  );
}

export default function ActivityLog() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, currentGroup, setCurrentGroup, userGroups } = useApp();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      const group = userGroups.find((g) => g.id === groupId);
      if (group) setCurrentGroup(group);
    }
  }, [groupId, userGroups]);

  useEffect(() => {
    if (!groupId) return;

    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data as unknown as ActivityLogEntry[]);
      }
      setLoading(false);
    };

    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel(`activity_log:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log", filter: `group_id=eq.${groupId}` },
        (payload) => {
          setEntries((prev) => [payload.new as unknown as ActivityLogEntry, ...prev]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [groupId]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityLogEntry[] }[] = [];
    let currentLabel = "";
    for (const entry of entries) {
      const label = getDateGroup(entry.created_at);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(entry);
    }
    return groups;
  }, [entries]);

  return (
    <div className="screen-container bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(`/groups/${groupId}/settings`)}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-sans text-lg font-bold text-foreground">Activity log</h1>
          <p className="text-xs text-muted-foreground">Every change, visible to all members</p>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Nothing yet</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Activity will appear here when expenses are added, edited, or deleted.
            </p>
          </div>
        ) : (
          grouped.map((group, idx) => (
            <div key={group.label}>
              {idx > 0 && <div className="border-t border-border my-2" />}
              <p className="text-xs font-medium text-muted-foreground tracking-wider mt-4 mb-1 px-1">
                {group.label}
              </p>
              {group.items.map((entry) => (
                <ActivityCard key={entry.id} entry={entry} currentUserId={user?.id} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
