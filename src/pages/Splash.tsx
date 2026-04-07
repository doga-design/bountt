import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";

export default function Splash() {
  const navigate = useNavigate();
  const { user, authLoading, userGroups, groupsLoading } = useApp();
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!minTimePassed || authLoading) return;
    if (user) {
      if (groupsLoading) return;
      if (userGroups.length > 0) {
        const lastGroupId = localStorage.getItem("bountt_last_group_id");
        const targetGroup = lastGroupId && userGroups.find((g) => g.id === lastGroupId)
          ? lastGroupId
          : userGroups[0].id;
        navigate(`/dashboard/${targetGroup}`, { replace: true });
      } else {
        navigate("/groups/empty", { replace: true });
      }
    } else {
      navigate("/auth", { replace: true });
    }
  }, [minTimePassed, authLoading, user, groupsLoading, userGroups, navigate]);

  return (
    <div className="screen-container bg-primary overflow-hidden flex items-center justify-center">
      <h1 className="bountt-wordmark text-5xl text-primary-foreground">
        bountt<span style={{ color: "#F5A623" }}>.</span>
      </h1>
    </div>
  );
}