import { useEffect, useRef } from "react";
import type { HorseState } from "@/lib/race";

export type HorseAnim = "idle" | "walk" | "gallop" | "jump";

/** Bone ids of the modular puppet rig. */
type Bone =
  | "root" | "body" | "neck" | "head" | "ear" | "eye"
  | "t1" | "t2" | "t3"
  | "fnU" | "fnL" | "ffU" | "ffL" | "hnU" | "hnL" | "hfU" | "hfL";

type Pose = Partial<Record<Bone, number>> & { y?: number; breathe?: number; blink?: number };

const TAU = Math.PI * 2;
const s = Math.sin;

/** Pose solvers: return bone angles (deg) for a cycle phase p (0..1). */
function legGallop(p: number, off: number, front: boolean): [number, number] {
  const w = TAU * (p + off);
  const upper = -32 * s(w);
  const lower = front ? 10 + 55 * Math.max(0, s(w + 1.2)) : -8 - 50 * Math.max(0, s(w - 1.2));
  return [upper, lower];
}
function legWalk(p: number, off: number, front: boolean): [number, number] {
  const w = TAU * (p + off);
  const upper = -16 * s(w);
  const lower = front ? 4 + 30 * Math.max(0, s(w + 1.4)) : -4 - 26 * Math.max(0, s(w - 1.4));
  return [upper, lower];
}

function solve(anim: HorseAnim, p: number, t: number, jump: number): Pose {
  const blink = (t % 3.2) < 0.12 ? 0.1 : 1;
  if (jump >= 0) {
    const j = jump;
    const arc = s(Math.PI * j);
    return {
      y: -46 * arc, body: -14 * Math.cos(Math.PI * j), neck: -10 * arc, head: 8 * arc,
      fnU: -55 * arc, fnL: 100 * arc, ffU: -45 * arc, ffL: 95 * arc,
      hnU: 35 * arc, hnL: -10 * arc, hfU: 42 * arc, hfL: -14 * arc,
      t1: 30 + 10 * arc, t2: 15, t3: 10, ear: -20, blink,
    };
  }
  if (anim === "gallop") {
    const w = TAU * p;
    const [fnU, fnL] = legGallop(p, 0.5, true);
    const [ffU, ffL] = legGallop(p, 0.6, true);
    const [hnU, hnL] = legGallop(p, 0, false);
    const [hfU, hfL] = legGallop(p, 0.1, false);
    return {
      y: -7 * Math.abs(s(w)), body: 5 * s(w), neck: -8 * s(w + 0.6), head: 6 * s(w + 1),
      fnU, fnL, ffU, ffL, hnU, hnL, hfU, hfL,
      t1: 55 + 10 * s(w), t2: 15 * s(w + 0.8), t3: 18 * s(w + 1.6), ear: -25, blink,
    };
  }
  if (anim === "walk") {
    const w = TAU * p;
    const [fnU, fnL] = legWalk(p, 0.25, true);
    const [ffU, ffL] = legWalk(p, 0.75, true);
    const [hnU, hnL] = legWalk(p, 0, false);
    const [hfU, hfL] = legWalk(p, 0.5, false);
    return {
      y: -1.5 * Math.abs(s(w * 2)), body: 1.5 * s(w * 2), neck: 6 * s(w * 2), head: -4 * s(w * 2),
      fnU, fnL, ffU, ffL, hnU, hnL, hfU, hfL,
      t1: 20 + 6 * s(w), t2: 10 * s(w + 1), t3: 12 * s(w + 2), ear: 4 * s(w), blink,
    };
  }
  // idle
  const flick = (t % 2.7) < 0.2 ? -25 : 0;
  return {
    y: 0, breathe: 1 + 0.025 * s(t * 2.4), body: 0, neck: 4 * s(t * 0.9), head: 6 * s(t * 0.9 + 0.5),
    fnU: 0, fnL: 0, ffU: 0, ffL: 0, hnU: 0, hnL: 0, hfU: 0, hfL: 0,
    t1: 12 + 8 * s(t * 1.6), t2: 14 * s(t * 1.6 + 0.8), t3: 18 * s(t * 1.6 + 1.6), ear: flick, blink,
  };
}

/** Pivot points (local to parent bone) for each bone. */
const PIVOT: Record<Bone, [number, number]> = {
  root: [0, 0], body: [100, 78], neck: [38, -14], head: [24, -36], ear: [2, -16], eye: [12, -4],
  t1: [-40, -12], t2: [-2, 18], t3: [-2, 16],
  fnU: [30, 6], fnL: [0, 26], ffU: [24, 4], ffL: [0, 26],
  hnU: [-30, 4], hnL: [0, 26], hfU: [-36, 2], hfL: [0, 26],
};

function Limb({ id, color, far, ink, refs, front }: {
  id: "fn" | "ff" | "hn" | "hf"; color: string; far?: boolean; ink: string; front: boolean;
  refs: React.MutableRefObject<Partial<Record<Bone, SVGGElement | null>>>;
}) {
  const U = `${id}U` as Bone, L = `${id}L` as Bone;
  const op = far ? 0.72 : 1;
  return (
    <g ref={(el) => { refs.current[U] = el; }} opacity={op}>
      {/* upper bone: thigh / forearm */}
      <path d={front ? "M-8 -6 Q-9 14 -5 26 L5 26 Q9 12 9 -6 Z" : "M-14 -10 Q-12 16 -5 26 L5 26 Q12 8 12 -10 Z"}
        fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <g ref={(el) => { refs.current[L] = el; }}>
        {/* lower bone: cannon + fetlock */}
        <path d="M-5 -2 L-4 22 Q-4 25 -1 25 L3 25 Q5 25 5 22 L5 -2 Z" fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        {/* white sock + hoof */}
        <rect x="-5" y="16" width="10" height="7" rx="2" fill="var(--gate)" stroke={ink} strokeWidth="2" />
        <path d="M-6 22 L7 22 L8 30 L-6 30 Z" fill={ink} />
      </g>
    </g>
  );
}

export function Horse({ color, mane = "var(--ink)", state = "normal", anim, size = 200 }: {
  color: string; mane?: string; state?: HorseState; anim: HorseAnim; size?: number;
}) {
  const refs = useRef<Partial<Record<Bone, SVGGElement | null>>>({});
  const rootRef = useRef<SVGGElement | null>(null);
  const breatheRef = useRef<SVGGElement | null>(null);
  const eyeRef = useRef<SVGGElement | null>(null);
  const animRef = useRef(anim);
  const stateRef = useRef(state);
  const jumpStart = useRef<number>(-1);

  animRef.current = anim;
  useEffect(() => {
    // Turbo boost triggers a jump/leap
    if (state === "turbo" && stateRef.current !== "turbo" && anim === "gallop") jumpStart.current = performance.now();
    stateRef.current = state;
  }, [state, anim]);
  useEffect(() => {
    if (anim === "jump") jumpStart.current = performance.now();
  }, [anim]);

  useEffect(() => {
    let raf = 0, phase = Math.random(), last = performance.now();
    const t0 = last - Math.random() * 3000;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const a = animRef.current, st = stateRef.current;
      const rate = a === "gallop" ? (st === "turbo" ? 3.6 : st === "tired" ? 1.3 : 2.3) : a === "walk" ? 1 : 0;
      phase = (phase + dt * rate) % 1;
      let j = -1;
      if (jumpStart.current >= 0) {
        j = (now - jumpStart.current) / 650;
        if (j >= 1) { jumpStart.current = -1; j = -1; }
      }
      const pose = solve(a, phase, (now - t0) / 1000, j);
      const wob = st === "drunk" && a === "gallop" ? 8 * s(now / 180) : 0;
      for (const k of Object.keys(PIVOT) as Bone[]) {
        const el = refs.current[k]; if (!el) continue;
        const [px, py] = PIVOT[k];
        const rot = (pose[k] ?? 0) + (k === "body" ? wob : 0);
        el.setAttribute("transform", `translate(${px} ${py}) rotate(${rot.toFixed(2)})`);
      }
      rootRef.current?.setAttribute("transform", `translate(0 ${(pose.y ?? 0).toFixed(2)})`);
      breatheRef.current?.setAttribute("transform", `scale(1 ${(pose.breathe ?? 1).toFixed(3)})`);
      eyeRef.current?.setAttribute("transform", `scale(1 ${pose.blink ?? 1})`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ink = "var(--ink)";
  const R = (b: Bone) => (el: SVGGElement | null) => { refs.current[b] = el; };
  const shadowScale = anim === "jump" ? 0.7 : 1;

  return (
    <svg viewBox="0 0 200 140" width={size} height={size * 0.7} style={{ overflow: "visible" }}>
      <ellipse cx="100" cy="134" rx={62 * shadowScale} ry="6" fill={ink} opacity="0.18" />
      <g ref={rootRef}>
        <g ref={R("body")}>
          {/* far legs (behind body) */}
          <g ref={R("hfU")}><Limb id="hf" color={color} far ink={ink} refs={refs} front={false} /></g>
          <g ref={R("ffU")}><Limb id="ff" color={color} far ink={ink} refs={refs} front /></g>
          {/* tail chain */}
          <g ref={R("t1")}>
            <path d="M0 0 Q-10 8 -4 20 Q4 12 6 2 Z" fill={mane} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
            <g ref={R("t2")}>
              <path d="M-2 0 Q-12 10 -4 18 Q4 10 4 0 Z" fill={mane} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
              <g ref={R("t3")}>
                <path d="M-2 0 Q-14 12 -2 22 Q2 14 4 0 Z" fill={mane} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
              </g>
            </g>
          </g>
          {/* torso */}
          <g ref={breatheRef}>
            <path d="M-44 -6 Q-46 -22 -26 -24 Q0 -20 24 -24 Q46 -26 48 -4 Q48 14 30 18 Q0 22 -30 18 Q-48 14 -44 -6 Z"
              fill={color} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M-30 10 Q0 16 30 10" fill="none" stroke={ink} strokeWidth="2" opacity="0.25" />
            {/* saddle cloth */}
            <path d="M-12 -22 L14 -23 L16 2 Q2 6 -12 2 Z" fill="var(--primary)" stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
          </g>
          {/* neck + head chain */}
          <g ref={R("neck")}>
            <path d="M-10 6 Q-6 -24 16 -42 L32 -32 Q14 -14 14 10 Z" fill={color} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M-6 -6 Q0 -30 18 -46 Q10 -40 8 -30 Q14 -34 10 -22 Q4 -14 2 0 Z" fill={mane} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
            <g ref={R("head")}>
              <path d="M-8 -6 Q-6 -20 10 -18 Q30 -14 40 0 Q44 10 34 12 Q18 12 4 10 Q-10 6 -8 -6 Z"
                fill={color} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
              <ellipse cx="34" cy="6" rx="9" ry="7" fill="var(--gate)" stroke={ink} strokeWidth="2.5" opacity="0.9" />
              <circle cx="38" cy="5" r="1.6" fill={ink} />
              <path d="M10 -16 Q14 -10 18 -15" fill="none" stroke={ink} strokeWidth="2" />
              <g ref={R("ear")}>
                <path d="M-4 0 L0 -14 L6 0 Z" fill={color} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
              </g>
              <path d="M-4 -12 Q2 -24 10 -18 Q4 -16 6 -10 Z" fill={mane} stroke={ink} strokeWidth="2" />
              <g transform="translate(12 -4)">
                <g ref={eyeRef}>
                  <ellipse cx="0" cy="0" rx="5" ry="6" fill={ink} />
                  <circle cx="1.6" cy="-2" r="1.8" fill="var(--gate)" />
                </g>
              </g>
              <ellipse cx="18" cy="6" rx="4" ry="2.5" fill="var(--primary)" opacity="0.35" />
            </g>
          </g>
          {/* near legs (in front of body) */}
          <g ref={R("hnU")}><Limb id="hn" color={color} ink={ink} refs={refs} front={false} /></g>
          <g ref={R("fnU")}><Limb id="fn" color={color} ink={ink} refs={refs} front /></g>
        </g>
      </g>
    </svg>
  );
}
