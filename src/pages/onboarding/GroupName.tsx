import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { GROUP_ICON_IDS, getGroupIconSrc } from "@/lib/group-icon-utils";

const SUGGESTIONS = [
  { label: "Lake House", icon: "icon-05" },
  { label: "The Condo", icon: "icon-05" },
  { label: "Planners", icon: "icon-10" },
  { label: "Road Trip", icon: "icon-02" },
  { label: "Foodies", icon: "icon-01" },
  { label: "The Squad", icon: "icon-03" },
  { label: "Beach Trip", icon: "icon-06" },
  { label: "Ski Trip", icon: "icon-09" },
];

export default function GroupName() {
  const navigate = useNavigate();
  const { createGroup, user } = useApp();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("icon-01");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      toast({ title: "Give your group a name first!", variant: "destructive" });
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    const group = await createGroup(name.trim(), icon);
    setLoading(false);

    if (group) {
      navigate(`/onboarding/invite?groupId=${group.id}`, { state: { group } });
    } else {
      toast({ title: "Failed to create group", description: "Please try again.", variant: "destructive" });
    }
  };

  const selectSuggestion = (s: { label: string; icon: string }) => {
    setName(s.label);
    setIcon(s.icon);
  };

  return (
    <div className="screen-container relative bg-background">
     
    {/* Orange header: wide background shape + normal-width content */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-[500px] h-[200px] bg-primary pt-12 pb-10"
        style={{ borderBottomLeftRadius: "50%", borderBottomRightRadius: "50%" }}
        aria-hidden
      />

      <div className="relative z-20 px-6 pt-12 pb-10">
        {/* Nav row: back | progress | continue */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigate("/auth")}
            className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </button>

          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center justify-center gap-2"
              role="progressbar"
              aria-label="Step 1 of 2"
              aria-valuenow={1}
              aria-valuemax={2}
            >
              <div className="w-8 h-2 bg-primary-foreground rounded-full" />
              <div className="w-2 h-2 bg-primary-foreground/40 rounded-full" />
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={loading || !name.trim()}
            className="w-11 h-11 rounded-full bg-primary-foreground/20 flex items-center justify-center disabled:opacity-40"
            aria-label="Continue"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>

        {/* bountt. wordmark */}
        <h1 className="bountt-wordmark text-3xl text-primary-foreground text-center mb-3">
          bountt<span className="opacity-70">.</span>
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-8">
        {/* Header pill */}
        <div className="flex z-10 justify-center mb-10 -mt-16">
          <span className="bg-secondary text-secondary-foreground rounded-2xl px-6 py-4 text-sm font-bold">
            Name your group
          </span>
        </div>
        <p className="text-left text-muted-foreground text-sm mb-2">
          This is what everyone will see
        </p>

        {/* Group name input */}
        <div className="bg-card rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 mb-4">
          {/* Icon picker button */}
          <button
            type="button"
            onClick={() => setShowIconPicker((p) => !p)}
            className="flex-shrink-0 w-8 h-8"
          >
            <img src={getGroupIconSrc(icon)} alt="Group icon" className="w-8 h-8" />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name..."
            maxLength={50}
            className="flex-1 text-base text-foreground bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Icon picker */}
        {showIconPicker && (
          <div className="bg-card rounded-2xl p-4 shadow-sm mb-4 animate-fade-in">
            <div className="grid grid-cols-5 gap-3">
              {GROUP_ICON_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => { setIcon(id); setShowIconPicker(false); }}
                  className={`p-2 rounded-xl transition-all flex items-center justify-center ${icon === id ? "bg-primary/10 scale-110" : "hover:bg-muted"}`}
                >
                  <img src={getGroupIconSrc(id)} alt={id} className="w-8 h-8" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion chips — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto chip-scroll pb-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => selectSuggestion(s)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all ${
                name === s.label
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-10 pt-6">
        <button
          onClick={handleContinue}
          disabled={loading || !name.trim()}
          className={`w-full rounded-full py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
            name.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <>
              Continue
              <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
