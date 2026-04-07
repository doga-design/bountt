import { useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { fireMemberAdded } from "@/lib/confetti-utils";

export default function EmptyState() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentGroup, addPlaceholderMember } = useApp();
  const { toast } = useToast();
  const hasText = name.trim().length > 0;
  const hasAddedFirstMemberRef = useRef(false);

  const handleSubmit = async () => {
    if (!hasText || !currentGroup || loading) return;
    setLoading(true);

    const member = await addPlaceholderMember(currentGroup.id, name.trim());
    if (member) {
      setName("");
      if (!hasAddedFirstMemberRef.current) {
        hasAddedFirstMemberRef.current = true;
        console.log('[confetti] calling fireMemberAdded');
        fireMemberAdded();
      }
    } else {
      toast({ title: "Couldn't add member", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col items-leftjustify-start px-6 py-10 mt-10">
      <h2 className="text-xl font-bold text-foreground text-left mb-2 tracking-tight leading-tight">
        Who've you been splitting costs with?
      </h2>
      <p className="text-sm text-muted-foreground text-left mb-8 font-medium">
        Type your friend's name to get started!
      </p>

      <div
        className={`w-full flex items-center gap-2 bg-card rounded-2xl px-4 py-3 border-2 transition-colors ${
          hasText ? "border-primary" : "border-transparent"
        }`}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Kyle, Sarah..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base font-medium text-sm"
          maxLength={50}
          aria-label="Friend's name"
        />
        <button
          onClick={handleSubmit}
          disabled={!hasText || loading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            hasText
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label="Add member"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
