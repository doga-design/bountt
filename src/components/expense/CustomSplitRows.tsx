import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface CustomSplitRowsProps {
  members: GroupMember[];
  currentUserId: string | undefined;
  customAmounts: Map<string, string>;
  focusedMemberId: string | null;
  shakeMemberId: string | null;
  onFocus: (memberId: string) => void;
  visible: boolean;
}

export default function CustomSplitRows({
  members,
  currentUserId,
  customAmounts,
  focusedMemberId,
  shakeMemberId,
  onFocus,
  visible,
}: CustomSplitRowsProps) {
  if (!visible) return null;

  return (
    <div className="px-4 py-2">
      {members.map((m) => {
        const isSelf = m.user_id === currentUserId;
        const isFocused = focusedMemberId === m.id;
        const isShaking = shakeMemberId === m.id;
        const { bg } = getAvatarColor(m);
        const avatarImg = getAvatarImage(m);
        const amountStr = customAmounts.get(m.id) ?? "0";
        const displayAmount = amountStr === "0" ? "0" : amountStr;

        return (
          <div key={m.id}>
            <button
              onClick={() => onFocus(m.id)}
              className={`w-full flex items-center gap-4 py-3 transition-all ${isShaking ? "animate-shake-x" : ""}`}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 72 }}>
                <div
                  className="rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: bg,
                    border: isFocused ? "3px solid white" : "3px solid transparent",
                    boxShadow: isFocused ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <img
                    src={avatarImg}
                    alt={m.name}
                    className="w-[75%] h-[75%] object-contain"
                    draggable={false}
                  />
                </div>
                <span
                  className={`mt-1 truncate w-full text-center text-xs text-muted-foreground ${isSelf ? "font-bold" : ""}`}
                >
                  {isSelf ? "You" : m.name}
                </span>
              </div>

              {/* Amount box — nudged up to align with avatar circle (row centers against circle + label) */}
              <div
                className="-mt-4 flex flex-1 items-center justify-end rounded-2xl px-4 py-3 transition-colors"
                style={{
                  backgroundColor: isFocused
                    ? `color-mix(in srgb, ${bg} 32%, #DDD)`
                    : `color-mix(in srgb, ${bg} 22%, #EEE)`,
                  boxShadow:
                    "inset 6px 8px 4px -4px rgba(0,0,0,0.1), inset 0px 23px 4px -12px rgba(0,0,0,0.1)",
                }}
              >
                <div className="flex items-baseline">
                  <span className="mr-0.5 text-sm font-bold text-muted-foreground">$</span>
                  <span className="text-[24px] font-extrabold font-sans text-foreground">
                    {displayAmount}
                  </span>
                  {isFocused && (
                    <span className="ml-0.5 h-[22px] w-[2px] animate-blink rounded-full bg-foreground" />
                  )}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
