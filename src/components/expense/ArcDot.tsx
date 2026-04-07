import { useEffect, useRef } from "react";

const N_SEGS = 12;
const SEG_SPACING = 0.026;
/** Peak of easeInOutQuint derivative at t = 0.5 (used to normalize ellipse stretch). */
const MAX_DERIVATIVE = 0.5;
const DEFAULT_DOT_COLOR = "#D4D4D4";

/** Slow → fast → slow (stronger than cubic; closer to polished UI motion). */
function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

/** d/dt easeInOutQuint — drives velocity-based ellipse stretch along the motion curve. */
function easeInOutQuintDerivative(t: number) {
  if (t < 0.5) return 80 * t * t * t * t;
  const u = -2 * t + 2;
  return 5 * u * u * u * u;
}

function quadBezierPoint(
  t: number,
  from: { x: number; y: number },
  ctrl: { x: number; y: number },
  to: { x: number; y: number },
) {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * ctrl.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * ctrl.y + t * t * to.y,
  };
}

function buildLUT(
  from: { x: number; y: number },
  ctrl: { x: number; y: number },
  to: { x: number; y: number },
  steps = 60,
) {
  const lut: { t: number; len: number }[] = [{ t: 0, len: 0 }];
  let cumLen = 0;
  let prev = quadBezierPoint(0, from, ctrl, to);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const curr = quadBezierPoint(t, from, ctrl, to);
    cumLen += Math.hypot(curr.x - prev.x, curr.y - prev.y);
    lut.push({ t, len: cumLen });
    prev = curr;
  }
  return lut;
}

function lutLookup(lut: { t: number; len: number }[], fraction: number) {
  const total = lut[lut.length - 1].len;
  const target = fraction * total;
  let lo = 0;
  let hi = lut.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (lut[mid].len < target) lo = mid;
    else hi = mid;
  }
  const a = lut[lo];
  const b = lut[hi];
  const blend = b.len === a.len ? 0 : (target - a.len) / (b.len - a.len);
  return a.t + blend * (b.t - a.t);
}

export interface ArcDotProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ctrlX: number;
  ctrlY: number;
  index: number;
  /** Member avatar `bg` from `getAvatarColor` (matches splitter palette). */
  color?: string;
}

export function ArcDot({
  fromX,
  fromY,
  toX,
  toY,
  ctrlX,
  ctrlY,
  index,
  color = DEFAULT_DOT_COLOR,
}: ArcDotProps) {
  const dotRef = useRef<SVGEllipseElement>(null);
  const segsRef = useRef<(SVGLineElement | null)[]>(Array.from({ length: N_SEGS }, () => null));
  const stateRef = useRef({
    t: 0,
    isWaiting: true,
    waitDelay: index * 420 + Math.random() * 600,
    duration: 1800 + index * 160,
    lut: null as { t: number; len: number }[] | null,
  });

  const from = { x: fromX, y: fromY };
  const to = { x: toX, y: toY };
  const ctrl = { x: ctrlX, y: ctrlY };

  useEffect(() => {
    stateRef.current.lut = buildLUT(from, ctrl, to);
  }, [fromX, fromY, ctrlX, ctrlY, toX, toY]);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    let rafId: number;
    let lastTime: number | null = null;

    function hideAll() {
      dot.setAttribute("opacity", "0");
      segsRef.current.forEach((s) => {
        if (s) s.setAttribute("opacity", "0");
      });
    }

    function tick(now: number) {
      if (!lastTime) lastTime = now;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      const state = stateRef.current;
      const lut = state.lut;

      if (state.isWaiting) {
        state.waitDelay -= dt;
        hideAll();
        if (state.waitDelay <= 0) {
          state.isWaiting = false;
          state.t = 0;
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      state.t += dt / state.duration;

      if (state.t >= 1) {
        state.isWaiting = true;
        state.waitDelay = 600 + Math.random() * 2200;
        state.duration = 1800 + Math.random() * 800;
        hideAll();
        rafId = requestAnimationFrame(tick);
        return;
      }

      const easedT = easeInOutQuint(state.t);
      const pathT = lut ? lutLookup(lut, easedT) : easedT;
      const pos = quadBezierPoint(pathT, from, ctrl, to);

      const dT = 0.01;
      const tA = Math.max(0, pathT - dT);
      const tB = Math.min(1, pathT + dT);
      const pA = quadBezierPoint(tA, from, ctrl, to);
      const pB = quadBezierPoint(tB, from, ctrl, to);
      const angle = Math.atan2(pB.y - pA.y, pB.x - pA.x) * (180 / Math.PI);

      const rawV = easeInOutQuintDerivative(state.t);
      const normV = Math.min(rawV / MAX_DERIVATIVE, 1);
      const rx = 5 + normV * 8.5;
      const ry = Math.max(2, 5 - normV * 2.8);

      const edgeFade = Math.min(state.t * 8, 1) * Math.min((1 - state.t) * 8, 1);
      const opacity = 0.92 * edgeFade;

      dot.setAttribute("rx", rx.toFixed(2));
      dot.setAttribute("ry", ry.toFixed(2));
      dot.setAttribute("opacity", opacity.toFixed(3));
      dot.setAttribute(
        "transform",
        `translate(${pos.x.toFixed(2)},${pos.y.toFixed(2)}) rotate(${angle.toFixed(2)})`,
      );

      const pts = Array.from({ length: N_SEGS + 1 }, (_, k) => {
        const tRaw = state.t - k * SEG_SPACING;
        if (tRaw <= 0) return null;
        const eT = easeInOutQuint(Math.min(tRaw, 1));
        const pT = lut ? lutLookup(lut, eT) : eT;
        return quadBezierPoint(pT, from, ctrl, to);
      });

      segsRef.current.forEach((seg, j) => {
        if (!seg) return;
        const segFrom = pts[j];
        const segTo = pts[j + 1];
        if (!segFrom || !segTo) {
          seg.setAttribute("opacity", "0");
          return;
        }
        const falloff = Math.pow(1 - (j + 1) / (N_SEGS + 1), 1.6);
        seg.setAttribute("x1", segFrom.x.toFixed(2));
        seg.setAttribute("y1", segFrom.y.toFixed(2));
        seg.setAttribute("x2", segTo.x.toFixed(2));
        seg.setAttribute("y2", segTo.y.toFixed(2));
        seg.setAttribute("stroke-width", Math.max(0.5, 3 - j * 0.22).toFixed(2));
        seg.setAttribute("opacity", (opacity * falloff * 0.72).toFixed(3));
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fromX, fromY, ctrlX, ctrlY, toX, toY]);

  return (
    <g>
      <g filter="url(#trailLineGlow)">
        {Array.from({ length: N_SEGS }, (_, i) => (
          <line
            key={i}
            ref={(el) => {
              segsRef.current[i] = el;
            }}
            stroke={color}
            strokeLinecap="round"
            fill="none"
            opacity={0}
          />
        ))}
      </g>
      <ellipse
        ref={dotRef}
        rx={5}
        ry={5}
        fill={color}
        opacity={0}
        filter="url(#pulseGlow)"
      />
    </g>
  );
}
