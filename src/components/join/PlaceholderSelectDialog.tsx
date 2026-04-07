import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/bountt-utils";
import { getAvatarImageFromName, getAvatarColor } from "@/lib/avatar-utils";
import { GroupMember } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PlaceholderOption {
  id: string;
  name: string;
  totalExpenses: number;
}

interface PlaceholderSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholders: PlaceholderOption[];
  onSelect: (placeholderId: string | null) => void;
  loading: boolean;
}

export default function PlaceholderSelectDialog({
  open,
  onOpenChange,
  placeholders,
  onSelect,
  loading,
}: PlaceholderSelectDialogProps) {
  const [selected, setSelected] = useState<string | null | undefined>(undefined);

  const handleContinue = () => {
    if (selected === undefined) return;
    onSelect(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[360px] rounded-2xl p-0 gap-0">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-lg">Are you one of these people?</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select yourself to merge with your existing expenses, or join as someone new.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-2 space-y-2 max-h-[300px] overflow-y-auto">
          {placeholders.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                selected === p.id
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: getAvatarColor({ id: p.id, avatar_color: null, avatar_index: null } as GroupMember).bg }}>
                <img
                  src={getAvatarImageFromName(p.name)}
                  alt={p.name}
                  className="w-[75%] h-[75%] object-contain"
                  draggable={false}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.totalExpenses > 0
                    ? `Has ${formatCurrency(p.totalExpenses)} in shared expenses`
                    : "No expenses yet"}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected === p.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}
              >
                {selected === p.id && (
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            </button>
          ))}

          {/* "None of these" option */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
              selected === null
                ? "bg-primary/10 ring-2 ring-primary"
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">None of these</p>
              <p className="text-xs text-muted-foreground">I'm someone new</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === null ? "border-primary bg-primary" : "border-muted-foreground/30"
              }`}
            >
              {selected === null && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
          </button>
        </div>

        <div className="p-5 pt-3">
          <Button
            className="w-full rounded-full py-5 font-bold text-base"
            disabled={selected === undefined || loading}
            onClick={handleContinue}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
