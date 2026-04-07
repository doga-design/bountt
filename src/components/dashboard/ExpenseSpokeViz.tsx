import { useRef, useState, useEffect, useCallback } from "react";
import { GroupMember } from "@/types";
import { getAvatarColor, getAvatarImage } from "@/lib/avatar-utils";
import { formatCurrency } from "@/lib/bountt-utils";
import { Check } from "lucide-react";
import { ArcDot } from "@/components/expense/ArcDot";

export interface SpokeMember {
  splitId: string;
  name: string;
  userId: string | null;
  shareAmount: number;
  isSettled: boolean;
  member: GroupMember | null;
}

interface ExpenseSpokeVizProps {
  payer: GroupMember | null;
  payerName: string;
  totalAmount: number;
  members: SpokeMember[];
  currentUserId: string;
  isPayer: boolean;
  onMemberTap: (splitId: string, memberName: string, shareAmount: number) => void;
  memberAvatarRef?: (splitId: string, el: HTMLDivElement | null) => void;
  selectedSplitId?: string | null;
}

const PAYER_SIZE = 80;

function getMemberSize(count: number): number {
  if (count <= 1) return 80;
  if (count === 2) return 72;
  if (count === 3) return 64;
  if (count === 4) return 56;
  if (count === 5) return 44;
  return 40;
}

function getBorderWidth(memberSize: number): number {
  return Math.max(2, Math.round((memberSize * 3) / 48));
}

export default function ExpenseSpokeViz({
  payer,
  payerName,
  totalAmount,
  members,
  currentUserId,
  isPayer,
  onMemberTap,
  memberAvatarRef,
  selectedSplitId = null,
}: ExpenseSpokeVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const payerRef = useRef<HTMLDivElement>(null);
  const memberRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [payerPos, setPayerPos] = useState<{ x: number; y: number } | null>(null);
  const [memberPositions, setMemberPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

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

    const positions: Record<number, { x: number; y: number }> = {};
    memberRefs.current.forEach((el, idx) => {
      if (el) {
        const mRect = el.getBoundingClientRect();
        positions[idx] = {
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
    // Measure after layout paint
    const raf = requestAnimationFrame(measureAll);
    const ro = new ResizeObserver(measureAll);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [members.length, measureAll]);

  const count = members.length;
  const memberSize = getMemberSize(count);
  const memberBorder = getBorderWidth(memberSize);
  const { bg: payerColor, stroke: payerStroke } = payer
    ? getAvatarColor(payer)
    : { bg: "#B984E5", stroke: "#FFFFFF" };
  const payerImg = payer ? getAvatarImage(payer) : undefined;

  const canTap = (m: SpokeMember) => {
    if (m.isSettled) return false;
    if (m.userId === currentUserId) return true;
    if (isPayer && m.userId !== currentUserId) return true;
    return false;
  };

  const hasPositions = payerPos && Object.keys(memberPositions).length === count && count > 0;
  const hasSelection = !!selectedSplitId;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center w-full py-2"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(232, 72, 10, 0.04) 0%, transparent 70%)",
      }}
    >
      {/* SVG overlay for arc paths */}
      {hasPositions && (
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
          {members.map((m, i) => {
            const mPos = memberPositions[i];
            if (!mPos || !payerPos) return null;
            const ctrlX = (payerPos.x + mPos.x) / 2;
            const ctrlY = payerPos.y + (mPos.y - payerPos.y) * 0.15;
            const d = `M ${payerPos.x} ${payerPos.y} Q ${ctrlX} ${ctrlY} ${mPos.x} ${mPos.y}`;
            const { bg: splitterColor } = m.member ? getAvatarColor(m.member) : { bg: "#D4D4D4" };
            const hasSelection = !!selectedSplitId;
            const isSelected = selectedSplitId === m.splitId;
            const dimArc = hasSelection && !isSelected;

            return (
              <g key={i} opacity={m.isSettled ? 0.3 : dimArc ? 0.35 : 1}>
                <path
                  d={d}
                  stroke="#D4D4D4"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                />
                {!m.isSettled && (
                  <ArcDot
                    fromX={mPos.x}
                    fromY={mPos.y}
                    toX={payerPos.x}
                    toY={payerPos.y}
                    ctrlX={ctrlX}
                    ctrlY={ctrlY}
                    index={i}
                    color={dimArc ? "#BDBDBD" : splitterColor}
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Payer avatar + label */}
      <div className="flex flex-col items-center z-10">
        <div
          ref={payerRef}
          className="rounded-full flex items-center justify-center overflow-hidden"
          style={{
            width: PAYER_SIZE,
            height: PAYER_SIZE,
            backgroundColor: payerColor,
            border: hasSelection ? `3px solid ${payerStroke}` : "none",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          }}
        >
          {payerImg && (
            <img
              src={payerImg}
              alt={payerName}
              className="w-[75%] h-[75%] object-contain"
              draggable={false}
            />
          )}
        </div>
        <p className="mt-1.5 text-xs text-center">
          <span className={`font-medium text-muted-foreground ${isPayer ? "font-bold text-foreground" : ""}`}>
            {isPayer ? "You" : payerName} paid
          </span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-bold text-foreground">
            {formatCurrency(totalAmount)}
          </span>
        </p>
      </div>

      {/* Spacer for arc paths */}
      <div style={{ height: 60 }} />

      {/* Member avatars row */}
      <div className="flex justify-center w-full z-10" style={{ gap: 8 }}>
        {members.map((m, i) => {
          const { bg: memberColor, stroke: memberStroke } = m.member
            ? getAvatarColor(m.member)
            : { bg: "#B984E5", stroke: "#FFFFFF" };
          const memberImg = m.member ? getAvatarImage(m.member) : undefined;
          const tappable = canTap(m);
          const isMe = m.userId === currentUserId;
          const label = isMe ? "You" : m.name;
          const labelStyle = isMe ? { fontWeight: 700 as const } : undefined;
          const isSelected = selectedSplitId === m.splitId;
          const blurOthers = hasSelection && !isSelected;

          return (
            <div
              key={m.splitId}
              className="relative flex flex-col items-center"
              style={{ width: Math.max(memberSize, Math.min(72, memberSize + 24)) }}
            >
              {/* Settled badge — above avatar, not clipped */}
              {m.isSettled && (
                <div
                  className="absolute flex items-center justify-center rounded-full bg-foreground"
                  style={{
                    width: 18,
                    height: 18,
                    top: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                  }}
                >
                  <Check className="w-3 h-3 text-background" />
                </div>
              )}

              <div
                ref={(el) => {
                  if (el) memberRefs.current.set(i, el);
                  else memberRefs.current.delete(i);
                  memberAvatarRef?.(m.splitId, el);
                }}
                onClick={() =>
                  tappable && onMemberTap(m.splitId, m.name, m.shareAmount)
                }
                className={`rounded-full flex items-center justify-center overflow-hidden ${
                  tappable
                    ? "cursor-pointer active:scale-95 transition-transform"
                    : "cursor-default"
                }`}
                style={{
                  width: memberSize,
                  height: memberSize,
                  backgroundColor: memberColor,
                  border: hasSelection && !blurOthers ? `${memberBorder}px solid ${memberStroke}` : "none",
                  boxShadow: blurOthers ? "none" : "0 2px 8px rgba(0,0,0,0.12)",
                  filter: blurOthers ? "grayscale(100%) blur(1.5px)" : m.isSettled ? "grayscale(100%)" : "none",
                  opacity: blurOthers ? 0.55 : 1,
                }}
              >
                {memberImg && (
                  <img
                    src={memberImg}
                    alt={m.name}
                    className="w-[75%] h-[75%] object-contain"
                    draggable={false}
                  />
                )}
              </div>

              <span className="text-xs font-medium text-muted-foreground mt-1 text-center leading-tight max-w-[72px] break-words" style={labelStyle}>
                {m.isSettled ? `${label} settled` : `${label}'s share`}
              </span>
              <span className="text-xs font-bold text-foreground">
                {formatCurrency(m.shareAmount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
