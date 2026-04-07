import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Group } from "@/types";
import { generateJoinUrl } from "@/lib/bountt-utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function Invite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentGroup, setCurrentGroup, userGroups } = useApp();
  const { toast } = useToast();

  const [group, setGroup] = useState<Group | null>(location.state?.group ?? currentGroup);
  const [joinUrl, setJoinUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // If no group from state/context, try to load from URL param
  useEffect(() => {
    if (group) {
      setJoinUrl(generateJoinUrl(group.invite_code));
      return;
    }

    const groupId = searchParams.get("groupId");
    if (groupId) {
      // Try to find in userGroups first
      const found = userGroups.find((g) => g.id === groupId);
      if (found) {
        setGroup(found);
        setCurrentGroup(found);
        return;
      }

      // Otherwise fetch from DB
      setLoading(true);
      supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle()
        .then(({ data, error }) => {
          setLoading(false);
          if (error || !data) {
            navigate("/onboarding/group-name", { replace: true });
            return;
          }
          const g = data as Group;
          setGroup(g);
          setCurrentGroup(g);
        });
    } else {
      navigate("/onboarding/group-name", { replace: true });
    }
  }, []);

  useEffect(() => {
    if (group) {
      setJoinUrl(generateJoinUrl(group.invite_code));
    }
  }, [group]);

  const handleShare = async () => {
    if (!group) return;
    const shareData = {
      title: `Join ${group.name} on bountt`,
      text: `Use code ${group.invite_code} to join our group on bountt!`,
      url: joinUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(joinUrl);
      toast({ title: "Link copied!", description: "Share it with your friends." });
    }
  };

  const handleCopyCode = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(group.invite_code);
    toast({ title: "Code copied!", description: group.invite_code });
  };

  const handleContinue = () => {
    if (!group) return;
    navigate(`/dashboard/${group.id}`);
  };

  if (loading) {
    return (
      <div className="screen-container bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="screen-container relative min-h-0 h-[100svh] max-h-[100svh] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: "linear-gradient(180deg, #0073CA 0%, #003964 100%)" }}
      />
      <div
        className="absolute left-1/2 top-0 z-10 h-[200px] w-[500px] -translate-x-1/2 bg-primary pt-12 pb-10"
        style={{ borderBottomLeftRadius: "50%", borderBottomRightRadius: "50%" }}
        aria-hidden
      />

      <main className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-4 pt-12">
        <div className="mx-auto flex w-full max-w-md flex-col items-center">
          <div className="mt-4 flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/onboarding/group-name")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/20"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-primary-foreground" />
            </button>

            <div
              className="flex items-center justify-center gap-2"
              role="progressbar"
              aria-label="Step 2 of 2"
              aria-valuenow={2}
              aria-valuemax={2}
            >
              <div className="h-2 w-2 rounded-full bg-primary-foreground/40" />
              <div className="h-2 w-8 rounded-full bg-primary-foreground" />
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/20"
              aria-label="Continue"
            >
              <ChevronRight className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>

          <h1 className="bountt-wordmark mt-2 text-center text-3xl text-primary-foreground">
            bountt<span className="opacity-70">.</span>
          </h1>

          <div className="relative z-10 mt-4 flex justify-center">
            <span className="rounded-2xl bg-secondary px-6 py-4 text-sm font-bold text-secondary-foreground">
              Invite your friends
            </span>
          </div>

          <div
            className="mx-auto mt-4 w-full max-w-[300px] -rotate-[1.8deg] rounded-3xl border-2 border-white px-6 py-12 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)]"
            style={{ background: "linear-gradient(to bottom, hsl(0, 0.00%, 91.80%), hsl(0,0%,100%))" }}
          >
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your group code
            </p>

            <p className="mb-5 text-center font-bringbold text-5xl leading-none tracking-tight text-foreground">
              {group.invite_code}
            </p>

            <div className="mb-6 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleShare}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-muted shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
                style={{
                  background: "linear-gradient(to bottom, hsl(0, 0.00%, 87.10%), hsl(0, 0.00%, 87.80%))",
                }}
                aria-label="Share invite"
              >
                <Share2 className="h-6 w-6 text-foreground" />
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-muted shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
                style={{
                  background: "linear-gradient(to bottom, hsl(0, 0.00%, 87.10%), hsl(0, 0.00%, 87.80%))",
                }}
                aria-label="Copy invite code"
              >
                <ExternalLink className="h-6 w-6 text-foreground" />
              </button>
            </div>

            <p className="mb-3 text-center text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
              Or let your friends scan
            </p>

            <div className="flex justify-center">
              {joinUrl && (
                <QRCodeSVG
                  value={joinUrl}
                  size={160}
                  fgColor="hsl(var(--primary))"
                  bgColor="transparent"
                  level="M"
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-20 shrink-0 px-6 pb-10 pt-4">
        <div className="mx-auto flex w-full max-w-md justify-center">
          <button
            type="button"
            onClick={handleContinue}
            className="flex w-full max-w-[280px] items-center justify-center gap-2 rounded-full bg-white py-4 text-base font-bold text-primary shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.06)]"
          >
            Start your group
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
