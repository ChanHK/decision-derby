export type HorseState = "normal" | "turbo" | "drunk" | "tired" | "moonwalk" | "wrongway" | "banana" | "nap" | "zoomies";

export const STATE_INFO: Record<HorseState, { label: string; emoji: string; bubble?: string }> = {
  normal: { label: "Gallop", emoji: "🐎" },
  turbo: { label: "Turbo!", emoji: "⚡", bubble: "NYOOM!" },
  drunk: { label: "Drunk", emoji: "🍺", bubble: "hic!" },
  tired: { label: "Tired", emoji: "💤", bubble: "huff..." },
  moonwalk: { label: "Moonwalk", emoji: "🕺", bubble: "Hee-hee!" },
  wrongway: { label: "Wrong way!", emoji: "🔄", bubble: "Wait... where?!" },
  banana: { label: "Banana slip", emoji: "🍌", bubble: "WHOA!" },
  nap: { label: "Power nap", emoji: "😴", bubble: "Zzz..." },
  zoomies: { label: "Zoomies", emoji: "🌀", bubble: "WHEEE!" },
};

/** Progress (0..1) after which horses enter the final sprint. */
export const SPRINT_AT = 0.75;

/** Each horse gets its own personality: distinct base speed + how much it surges in the sprint. */
export const PERSONALITIES = [
  { name: "Early bird", base: 190, kick: 1.15 },
  { name: "Steady", base: 170, kick: 1.35 },
  { name: "Late charger", base: 150, kick: 1.8 },
  { name: "Plodder", base: 135, kick: 1.6 },
  { name: "Wildcard", base: 165, kick: 1.45 },
];

export function speedFor(state: HorseState, t: number, base: number, progress = 0, kick = 1.45): number {
  const sprint = progress >= SPRINT_AT ? kick + (progress - SPRINT_AT) * 1.2 : 1;
  switch (state) {
    case "turbo": return base * 2.1 * sprint;
    case "tired": return base * (progress >= SPRINT_AT ? 0.8 : 0.35) * sprint;
    case "drunk": return base * (Math.sin(t * 3) * 0.9 + 0.55) * sprint;
    case "moonwalk": return -base * 0.45;
    case "wrongway": return -base * 0.8;
    case "banana": return base * 0.15;
    case "nap": return 0;
    case "zoomies": return base * (1.2 + Math.sin(t * 9) * 1.1);
    default: return base * sprint;
  }
}

/** Surprises are rare: most rolls keep the horse galloping normally. */
export function randomState(rand: () => number = Math.random, leading = false, previous: HorseState = "normal"): HorseState {
  const r = rand();
  if (leading) {
    if (r < (previous === "turbo" ? 0.8 : 0.55)) {
      const mishaps: HorseState[] = ["wrongway", "moonwalk", "nap", "banana"];
      return mishaps[Math.floor(rand() * mishaps.length)] ?? "nap";
    }
    return "normal";
  }
  if (r < 0.45) return "normal";
  const specials: HorseState[] = ["turbo", "drunk", "tired", "moonwalk", "wrongway", "banana", "nap", "zoomies"];
  return specials[Math.floor(rand() * specials.length)] ?? "normal";
}

/** Auto-follow advances only; manual scrolling deliberately bypasses this rule. */
export function forwardCamera(current: number, target: number, maximum: number): number {
  return Math.min(maximum, Math.max(current, target, 0));
}

/** Seconds a special status lasts before the horse snaps back to normal. */
export function durationFor(state: HorseState): number {
  if (state === "banana") return 1.2;
  if (state === "wrongway" || state === "moonwalk") return 1.6;
  if (state === "nap") return 1.8;
  return 2.2;
}
