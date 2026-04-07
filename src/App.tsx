import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import DesktopShell from "@/components/layout/DesktopShell";

// Pages
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import GroupName from "./pages/onboarding/GroupName";
import Invite from "./pages/onboarding/Invite";
import Join from "./pages/Join";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import Groups from "./pages/Groups";
import GroupSettings from "./pages/GroupSettings";
import ActivityLog from "./pages/ActivityLog";
import NotFound from "./pages/NotFound";
import EmptyGroups from "./pages/EmptyGroups";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: ReactNode }) => (
  <AuthGuard>
    <DesktopShell>{children}</DesktopShell>
  </AuthGuard>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Splash />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* All protected routes — desktop gate applied universally */}
              <Route path="/groups/empty" element={<Protected><EmptyGroups /></Protected>} />
              <Route path="/profile" element={<Protected><Profile /></Protected>} />
              <Route path="/onboarding/group-name" element={<Protected><GroupName /></Protected>} />
              <Route path="/onboarding/invite" element={<Protected><Invite /></Protected>} />
              <Route path="/join" element={<Protected><Join /></Protected>} />
              <Route path="/join/:inviteCode" element={<Protected><Join /></Protected>} />
              <Route path="/dashboard/:groupId" element={<Protected><Dashboard /></Protected>} />
              <Route path="/groups" element={<Protected><Groups /></Protected>} />
              <Route path="/groups/:groupId/members" element={<Protected><ComingSoon title="Members — Phase 2" /></Protected>} />
              <Route path="/groups/:groupId/settings" element={<Protected><GroupSettings /></Protected>} />
              <Route path="/groups/:groupId/activity" element={<Protected><ActivityLog /></Protected>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
