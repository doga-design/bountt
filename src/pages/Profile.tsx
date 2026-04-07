import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Trash2, ExternalLink, Check } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useApp();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if profile loads after mount
  useEffect(() => {
    if (profile?.display_name && !displayName) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  const nameChanged = displayName.trim() !== (profile?.display_name ?? "");

  const handleSaveName = async () => {
    if (!user || !nameChanged) return;
    const trimmed = displayName.trim();
    if (!trimmed) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Failed to update name", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Name updated" });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No session");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Delete failed");
      }

      // Server deleted the user — sign out locally
      await supabase.auth.signOut({ scope: "local" });
    } catch (err: any) {
      setDeleting(false);
      toast({ title: "Failed to delete account", description: err.message, variant: "destructive" });
    }
  };

  const googleAvatar = user?.user_metadata?.avatar_url as string | undefined;
  const email = user?.email ?? "";

  return (
    <div className="screen-container bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Profile</h1>
      </div>

      <div className="flex-1 px-5 space-y-6">
        {/* Avatar + email */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {googleAvatar ? (
            <img
              src={googleAvatar}
              alt="Profile"
              className="w-20 h-20 rounded-full border-2 border-border"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {(profile?.display_name ?? email)?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <svg viewBox="0 0 24 24" className="w-3 h-3" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
              Google account
            </span>
          </div>
        </div>

        {/* Display name */}
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Display name
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 bg-transparent text-foreground text-base outline-none border-b border-border focus:border-primary pb-1 transition-colors"
              placeholder="Your name"
              maxLength={50}
            />
            {nameChanged && (
              <button
                onClick={handleSaveName}
                disabled={saving || !displayName.trim()}
                className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Save name"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Changing your name here won't update your name in existing groups.
          </p>
        </div>

        {/* Links */}
        <div className="bg-card rounded-2xl divide-y divide-border">
          <a
            href="https://bountt.app/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm text-foreground">Terms of Service</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
          <a
            href="https://bountt.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5"
          >
            <span className="text-sm text-foreground">Privacy Policy</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-card rounded-2xl py-3.5 text-sm font-medium text-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>

        {/* Delete account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-medium text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete account
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and removes you from all groups. 
                Group ownership will transfer to another member if available. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          Bountt v1.0
        </p>
      </div>
    </div>
  );
}
