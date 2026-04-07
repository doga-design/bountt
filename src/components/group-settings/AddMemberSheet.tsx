import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onAdd: (name: string) => Promise<void>;
}

export default function AddMemberSheet({ open, onOpenChange, groupName, onAdd }: AddMemberSheetProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name.trim());
    setName("");
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add to {groupName}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-4">
          <Input
            placeholder="Friend's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            You can add them as a placeholder and invite them later
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!name.trim() || loading}
            >
              {loading ? "Adding..." : "Add as Placeholder"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
