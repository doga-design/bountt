import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import authLogoImg from "@/assets/auth-logo-img.svg";
import FloatingIcons from "@/components/auth/FloatingIcons";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, authLoading, userGroups, groupsLoading } = useApp();
  const redirectTo = (location.state as { from?: string })?.from;

  // If already logged in, redirect smartly
  useEffect(() => {
    if (authLoading || !user) return;
    if (groupsLoading) return;

    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    } else if (userGroups.length > 0) {
      navigate(`/dashboard/${userGroups[0].id}`, { replace: true });
    } else {
      navigate("/groups/empty", { replace: true });
    }
  }, [user, authLoading, userGroups, groupsLoading, navigate]);

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
    }
  };

  // Don't render if already logged in
  if (user && !authLoading) return null;

  return (
    <div className="auth-page-root bg-background">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="auth-ambient-glow-wrap">
          <div className="auth-ambient-glow-blob" />
        </div>
      </div>
      <FloatingIcons />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-6">
        <div className="w-full max-w-sm flex flex-col items-center">
          <img src={authLogoImg} alt="" className="w-[46px] h-[48px] mb-4" />
          <h1 className="bountt-wordmark text-5xl text-primary mb-1">bountt.</h1>

          <p className="text-muted-foreground text-base font-medium mb-6">Split costs with friends. No drama.</p>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-[340px] h-[60px] bg-card rounded-full px-5 py-4 flex items-center justify-center gap-3 font-semibold text-foreground text-base active:scale-[0.98] transition-transform"
            style={{ boxShadow: "rgba(0, 0, 0, 0.25) 0px 25px 50px -12px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed max-w-[280px]">
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
