import { useState } from "react";
import { Group } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { getGroupIconSrc, GROUP_ICON_IDS } from "@/lib/group-icon-utils";
import { getBackgroundSrc, BACKGROUND_IDS } from "@/lib/background-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GroupBannerProps {
  group: Group;
}

export default function GroupBanner({ group }: GroupBannerProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [showPicker, setShowPicker] = useState(false);
  const { updateGroup, user } = useApp();

  const isCreator = group.created_by === user?.id;
  const bgSrc = getBackgroundSrc(group.banner_gradient);

  const handleNameSave = async () => {
    setEditing(false);
    if (name.trim() && name.trim() !== group.name) {
      await updateGroup(group.id, { name: name.trim() });
    }
  };

  return (
    <>
      <div
        className={`relative h-[200px] flex flex-col items-center justify-center ${isCreator ? "cursor-pointer" : ""}`}
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={() => isCreator && !editing && setShowPicker(true)}
      >
        <img
          src={getGroupIconSrc(group.emoji)}
          alt=""
          className="w-12 h-12 mb-3"
          style={{ filter: "brightness(0) invert(1)" }}
        />
        {isCreator && editing ? (
          <input
            className="text-2xl font-bold text-primary-foreground bg-transparent text-center outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h1
            className={`text-2xl font-bold text-primary-foreground ${isCreator ? "cursor-text" : ""}`}
            onClick={(e) => {
              if (!isCreator) return;
              e.stopPropagation();
              setEditing(true);
            }}
          >
            {group.name}
          </h1>
        )}
      </div>

      {isCreator && (
        <CustomizePicker
          open={showPicker}
          onOpenChange={setShowPicker}
          currentIcon={group.emoji}
          currentBg={group.banner_gradient}
          onSave={async (icon, bg) => {
            const updates: Record<string, string> = {};
            if (icon !== group.emoji) updates.emoji = icon;
            if (bg !== group.banner_gradient) updates.banner_gradient = bg;
            if (Object.keys(updates).length > 0) {
              await updateGroup(group.id, updates);
            }
            setShowPicker(false);
          }}
        />
      )}
    </>
  );
}

/* ─── Combined Icon + Wallpaper Picker ─── */

interface CustomizePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIcon: string;
  currentBg: string;
  onSave: (icon: string, bg: string) => void;
}

function CustomizePicker({ open, onOpenChange, currentIcon, currentBg, onSave }: CustomizePickerProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedBg, setSelectedBg] = useState(currentBg);

  // Reset when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setSelectedIcon(currentIcon);
      setSelectedBg(currentBg);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Customize group</DialogTitle>
        </DialogHeader>

        {/* Icon picker */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Icon</p>
          <div className="grid grid-cols-5 gap-2">
            {GROUP_ICON_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedIcon(id)}
                className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                  selectedIcon === id
                    ? "border-2 border-primary bg-primary/10 scale-105"
                    : "border border-border bg-muted"
                }`}
              >
                <img src={getGroupIconSrc(id)} alt="" className="w-7 h-7" />
              </button>
            ))}
          </div>
        </div>

        {/* Wallpaper picker */}
        <div className="space-y-2 mt-2">
          <p className="text-sm font-semibold text-foreground">Wallpaper</p>
          <div className="grid grid-cols-3 gap-3">
            {BACKGROUND_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setSelectedBg(id)}
                className={`w-full aspect-[3/2] rounded-xl overflow-hidden transition-all ${
                  selectedBg === id ? "ring-2 ring-primary scale-105" : "ring-1 ring-border"
                }`}
              >
                <img
                  src={getBackgroundSrc(id)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {/* Sixth slot — cosmetic "+" */}
            <div
              className="w-full aspect-[3/2] rounded-xl flex items-center justify-center"
              style={{ border: "1.5px dashed hsl(var(--muted-foreground) / 0.4)" }}
            >
              <span className="text-lg text-muted-foreground">+</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={() => onSave(selectedIcon, selectedBg)}
          className="w-full mt-3 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
        >
          Save
        </button>
      </DialogContent>
    </Dialog>
  );
}
