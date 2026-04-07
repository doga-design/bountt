import { Settings, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

export default function DesktopTopBar() {
  const navigate = useNavigate();
  const { currentGroup, userGroups, user } = useApp();

  return (
    <header className="desktop-shell-topbar">
      <div className="desktop-shell-workspace">
        <div className="desktop-shell-topbar-inner">
          <button className="desktop-brand" onClick={() => navigate("/groups")} aria-label="Go to groups">
            bountt.
          </button>

          <div className="desktop-group-switch">
            <label htmlFor="desktop-group-switch" className="sr-only">
              Switch group
            </label>
            <select
              id="desktop-group-switch"
              className="desktop-group-select"
              value={currentGroup?.id ?? ""}
              onChange={(e) => navigate(`/dashboard/${e.target.value}`)}
            >
              {userGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="desktop-top-actions">
            <button className="desktop-icon-btn" onClick={() => navigate("/profile")} aria-label="Profile">
              <UserRound className="h-4 w-4" />
            </button>
            {currentGroup && (
              <button
                className="desktop-icon-btn"
                onClick={() => navigate(`/groups/${currentGroup.id}/settings`)}
                aria-label="Group settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
            <span className="desktop-user-email">{user?.email ?? ""}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
