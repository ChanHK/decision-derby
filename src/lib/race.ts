export type HorseState = "normal" | "turbo" | "drunk" | "tired";

export const STATE_INFO: Record<HorseState, { label: string; emoji: string }> = {
  normal: { label: "Gallop", emoji: "🐎" },
  turbo: { label: "Turbo!", emoji: "⚡" },
  drunk: { label: "Drunk", emoji: "🍺" },
  tired: { label: "Tired", emoji: "💤" },
};

export function speedFor(state: HorseState, t: number, base: number): number {
  switch (state) {
    case "turbo":
      return base * 2.1;
    case "tired":
      return base * 0.35;
    case "drunk":
      return base * (Math.sin(t * 3) * 1.4 + 0.1);
    default:
      return base;
  }
}

export function randomState(rand: () => number = Math.random): HorseState {
  const r = rand();
  if (r < 0.4) return "normal";
  if (r < 0.62) return "turbo";
  if (r < 0.82) return "drunk";
  return "tired";
}
