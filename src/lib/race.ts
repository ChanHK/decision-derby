export type HorseState = "normal" | "turbo" | "drunk" | "tired";

export const STATE_INFO: Record<HorseState, { label: string; emoji: string }> = {
  normal: { label: "Gallop", emoji: "🐎" },
  turbo: { label: "Turbo!", emoji: "⚡" },
  drunk: { label: "Drunk", emoji: "🍺" },
  tired: { label: "Tired", emoji: "💤" },
};

/** Progress (0..1) after which horses enter the final sprint. */
export const SPRINT_AT = 0.75;

export function speedFor(state: HorseState, t: number, base: number, progress = 0): number {
  const sprint = progress >= SPRINT_AT ? 1.45 + (progress - SPRINT_AT) * 1.2 : 1;
  switch (state) {
    case "turbo":
      return base * 2.1 * sprint;
    case "tired":
      return base * (progress >= SPRINT_AT ? 0.8 : 0.35) * sprint;
    case "drunk":
      return base * (Math.sin(t * 3) * 0.9 + 0.55) * sprint;
    default:
      return base * sprint;
  }
}

export function randomState(rand: () => number = Math.random): HorseState {
  const r = rand();
  if (r < 0.4) return "normal";
  if (r < 0.62) return "turbo";
  if (r < 0.82) return "drunk";
  return "tired";
}
