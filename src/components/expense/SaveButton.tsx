import { Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  active: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
  /** If true, shake on tap when disabled (Slide 1 behavior) */
  shakeOnDisabled?: boolean;
}

export default function SaveButton({
  active,
  loading,
  onClick,
  label = "Log cost",
  shakeOnDisabled = false,
}: SaveButtonProps) {
  const handleClick = () => {
    if (loading) return;
    if (!active && !shakeOnDisabled) return;
    onClick();
  };

  return (
    <div className="px-4 pb-2 pt-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-[18px] py-4 font-sans text-[17px] font-extrabold transition-all active:scale-[0.985]",
          active
            ? "bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)_/_0.3)]"
            : "bg-[#EAEAE6] text-[#C0C0BC]",
        )}
        style={{
          cursor: !active && !shakeOnDisabled ? "default" : "pointer",
        }}
      >
        {loading ? "Saving..." : label}
        {!loading && (
          active ? (
            <ArrowRight className="w-5 h-5" strokeWidth={3} />
          ) : (
            <Plus className="w-5 h-5" strokeWidth={3} />
          )
        )}
      </button>
    </div>
  );
}
