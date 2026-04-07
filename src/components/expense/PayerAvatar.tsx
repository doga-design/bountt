import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";

interface PayerAvatarProps {
  payer: GroupMember;
  onClick?: () => void;
  size?: number;
}

export default function PayerAvatar({ payer, onClick, size = 44 }: PayerAvatarProps) {
  const { bg } = getAvatarColor(payer);
  const avatarImg = getAvatarImage(payer);

  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-95 flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        border: "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <img
        src={avatarImg}
        alt={payer.name}
        className="w-[75%] h-[75%] object-contain"
        draggable={false}
      />
    </button>
  );
}
