import { Home, Layers, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface BottomNavProps {
  onFabPress: () => void;
}

export default function BottomNav({ onFabPress }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname.startsWith("/dashboard");
  const isGroups = location.pathname === "/groups";

  return (
    <div
      className="fixed bottom-0 left-1/2 z-[49] w-full -translate-x-1/2 bg-card px-12 pb-5 pt-4 shadow-[rgba(50,50,93,0.25)_0px_50px_100px_-20px,rgba(0,0,0,0.3)_0px_30px_60px_-30px] sm:bottom-24 sm:rounded-full"
      style={{ maxWidth: "min(var(--app-frame-width), var(--component-max-width))" }}
    >
      <div className="flex items-center justify-between">
        {/* Home */}
        <button
          onClick={() => {
            const lastGroupId = localStorage.getItem("bountt_last_group_id");
            if (lastGroupId) navigate(`/dashboard/${lastGroupId}`);
            else navigate("/groups");
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Home"
        >
          <Home className={`w-5 h-5 ${isHome ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[12px] font-semibold ${isHome ? "text-primary" : "text-muted-foreground"}`}>Home</span>
        </button>

        {/* FAB */}
        <button
          onClick={onFabPress}
          className="bottom-nav-fab relative -mt-8 rounded-full border-4 border-white bg-primary text-primary-foreground shadow-[0_8px_10px_rgba(0,0,0,0.15)] transition-transform active:scale-90"
          aria-label="Add expense"
        >
          <Plus className="bottom-nav-fab-icon mx-auto stroke-[3]" />
        </button>

        {/* All Groups */}
        <button
          onClick={() => navigate("/groups")}
          className="flex flex-col items-center gap-1"
          aria-label="All Groups"
        >
          <Layers className={`w-5 h-5 ${isGroups ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`text-[12px] font-semibold ${isGroups ? "text-primary" : "text-muted-foreground"}`}>
            All Groups
          </span>
        </button>
      </div>
    </div>
  );
}
