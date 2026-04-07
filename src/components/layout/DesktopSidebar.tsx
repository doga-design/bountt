import { Home, Layers, Activity, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

function isActive(pathname: string, target: string) {
  if (target === "/groups") return pathname === "/groups";
  return pathname.startsWith(target);
}

export default function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentGroup } = useApp();

  const items = [
    { label: "Dashboard", icon: Home, onClick: () => currentGroup && navigate(`/dashboard/${currentGroup.id}`), active: isActive(location.pathname, "/dashboard"), disabled: !currentGroup },
    { label: "Groups", icon: Layers, onClick: () => navigate("/groups"), active: isActive(location.pathname, "/groups"), disabled: false },
    {
      label: "Activity",
      icon: Activity,
      onClick: () => currentGroup && navigate(`/groups/${currentGroup.id}/activity`),
      active: currentGroup ? isActive(location.pathname, `/groups/${currentGroup.id}/activity`) : false,
      disabled: !currentGroup,
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => currentGroup && navigate(`/groups/${currentGroup.id}/settings`),
      active: currentGroup ? isActive(location.pathname, `/groups/${currentGroup.id}/settings`) : false,
      disabled: !currentGroup,
    },
  ];

  return (
    <aside className="desktop-shell-sidebar">
      <nav className="desktop-nav-list" aria-label="Desktop navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`desktop-nav-item ${item.active ? "is-active" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
