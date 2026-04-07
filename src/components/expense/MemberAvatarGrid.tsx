import { useRef, useState, useEffect, useCallback } from "react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { Plus } from "lucide-react";
import { ArcDot } from "./ArcDot";

interface MemberAvatarGridProps {
  members: GroupMember[];
  activeIds: Set<string>;
  onToggle: (memberId: string) => void;
  currentUserId: string | undefined;
  onAddMember?: () => void;
  splitAmounts?: Map<string, number>;
  payerMember?: GroupMember;
  payerOnClick?: () => void;
}

const PAYER_SIZE = 64;

function getMemberSize(count: number) {
  if (count <= 2) return { avatarSize: 80, fontSize: 16, gap: 14 };
  if (count <= 3) return { avatarSize: 72, fontSize: 15, gap: 12 };
  if (count <= 4) return { avatarSize: 64, fontSize: 14, gap: 10 };
  if (count <= 5) return { avatarSize: 56, fontSize: 13, gap: 8 };
  return { avatarSize: 48, fontSize: 12, gap: 6 };
}

export default function MemberAvatarGrid({
  members,
  activeIds,
  onToggle,
  currentUserId,
  onAddMember,
  splitAmounts,
  payerMember,
  payerOnClick,
}: MemberAvatarGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const payerRef = useRef<HTMLDivElement>(null);
  const memberRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [payerPos, setPayerPos] = useState<{ x: number; y: number } | null>(null);
  const [memberPositions, setMemberPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const { avatarSize, fontSize, gap } = getMemberSize(members.length);

  const measureAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setContainerSize({ w: cRect.width, h: cRect.height });

    if (payerRef.current) {
      const pRect = payerRef.current.getBoundingClientRect();
      setPayerPos({
        x: pRect.left + pRect.width / 2 - cRect.left,
        y: pRect.top + pRect.height / 2 - cRect.top,
      });
    }

    const positions: Record<string, { x: number; y: number }> = {};
    memberRefs.current.forEach((el, id) => {
      if (el) {
        const mRect = el.getBoundingClientRect();
        positions[id] = {
          x: mRect.left + mRect.width / 2 - cRect.left,
          y: mRect.top + mRect.height / 2 - cRect.top,
        };
      }
    });
    setMemberPositions(positions);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(measureAll);
    const ro = new ResizeObserver(measureAll);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [members.length, activeIds.size, measureAll]);

  // Determine active members that have positions
  const activeMembers = members.filter((m) => activeIds.has(m.id));
  const hasPositions = payerMember && payerPos && activeMembers.length > 0;

  const payerColor = payerMember ? getAvatarColor(payerMember).bg : "#B984E5";
  const payerImg = payerMember ? getAvatarImage(payerMember) : undefined;

  return (
    <div ref={containerRef} className="relative flex flex-col items-center w-full px-4 py-2">
      {/* SVG arc overlay */}
      {hasPositions && containerSize.w > 0 && (
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: containerSize.w,
            height: containerSize.h,
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <defs>
            <filter
              id="pulseGlow"
              x="-120%"
              y="-120%"
              width="340%"
              height="340%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter
              id="trailLineGlow"
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {activeMembers.map((m, i) => {
            const mPos = memberPositions[m.id];
            if (!mPos || !payerPos) return null;
            const ctrlX = (payerPos.x + mPos.x) / 2;
            const ctrlY = payerPos.y + (mPos.y - payerPos.y) * 0.15;
            const d = `M ${payerPos.x} ${payerPos.y} Q ${ctrlX} ${ctrlY} ${mPos.x} ${mPos.y}`;
            const { bg: splitterColor } = getAvatarColor(m);

            return (
              <g key={m.id}>
                <path
                  d={d}
                  stroke="#D4D4D4"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <ArcDot
                  fromX={mPos.x}
                  fromY={mPos.y}
                  toX={payerPos.x}
                  toY={payerPos.y}
                  ctrlX={ctrlX}
                  ctrlY={ctrlY}
                  index={i}
                  color={splitterColor}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Payer avatar at top center */}
      {payerMember && (
        <div className="flex flex-col items-center z-10 mb-2">
          <button
            onClick={payerOnClick}
            className="rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-95"
          >
            <div
              ref={payerRef}
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: PAYER_SIZE,
                height: PAYER_SIZE,
                backgroundColor: payerColor,
                border: "3px solid white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              }}
            >
              {payerImg && (
                <img
                  src={payerImg}
                  alt={payerMember.name}
                  className="w-[75%] h-[75%] object-contain"
                  draggable={false}
                />
              )}
            </div>
          </button>
          <span className="mt-1 text-xs font-bold text-muted-foreground">
            <span>
              {payerMember.user_id === currentUserId ? "You" : payerMember.name}
            </span>
            {" paid"}
          </span>
        </div>
      )}

      {/* Spacer for arc paths when payer is present */}
      {payerMember && activeMembers.length > 0 && <div style={{ height: 40 }} />}

      {/* Member avatars row */}
      <div
        className="flex justify-center relative z-10"
        style={{ gap, paddingTop: 4, paddingBottom: 4 }}
      >
        {members.map((m) => {
          const isActive = activeIds.has(m.id);
          const { bg, stroke } = getAvatarColor(m);
          const isSelf = m.user_id === currentUserId;
          const avatarImg = getAvatarImage(m);

          return (
            <button
              key={m.id}
              onClick={() => onToggle(m.id)}
              className="flex flex-col items-center transition-all active:scale-95"
              style={{ width: avatarSize }}
            >
              <div
                ref={(el) => {
                  if (el) memberRefs.current.set(m.id, el);
                  else memberRefs.current.delete(m.id);
                }}
                className="rounded-full flex items-center justify-center transition-all overflow-hidden"
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  backgroundColor: isActive ? bg : "#E0E0DC",
                  border: isActive ? `3px solid ${stroke}` : "3px solid white",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  filter: isActive ? "none" : "grayscale(100%)",
                  opacity: isActive ? 1 : 0.5,
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
                className="mt-1 flex w-full flex-col items-center text-center"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <span
                  className="w-full truncate"
                  style={{
                    fontSize,
                    fontWeight: isSelf || isActive ? 600 : undefined,
                  }}
                >
                  {isSelf ? "You" : m.name}
                </span>
                {isActive && splitAmounts?.has(m.id) && (
                  <span
                    className="w-full truncate"
                    style={{
                      fontSize: Math.max(fontSize - 1, 11),
                      fontWeight: 600,
                    }}
                  >
                    ${(() => {
                      const val = splitAmounts.get(m.id)!;
                      return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
                    })()}
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {onAddMember && (
          <button
            onClick={onAddMember}
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: 36,
              height: 36,
              top: '50%',
              right: -18,
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'white',
              border: '1.5px solid #E2E2DE',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}
            aria-label="Add member"
          >
            <Plus className="w-[18px] h-[18px]" style={{ color: '#888' }} />
          </button>
        )}
      </div>
    </div>
  );
}
