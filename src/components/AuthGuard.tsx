import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";

/** Wraps routes that require authentication. Only blocks on initial auth bootstrap.
 *  groupsLoading is NOT included — it can flip during background refreshes and
 *  must never unmount the authenticated component tree mid-use. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="screen-container bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: `${location.pathname}${location.search}` }} replace />;
  }

  return <>{children}</>;
}
