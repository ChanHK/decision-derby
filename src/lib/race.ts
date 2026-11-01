export type HorseState = "normal" | "turbo" | "drunk" | "tired" | "moonwalk" | "wrongway" | "stumble" | "graze" | "nap" | "zoomies" | "biped" | "winded" | "rocket" | "ufo" | "skate" | "exploded" | "wiped";

export const STATE_INFO: Record<HorseState, { label: string; emoji: string; bubble?: string }> = {
  normal: { label: "Gallop", emoji: "🐎" },
  turbo: { label: "Turbo!", emoji: "⚡", bubble: "NYOOM!" },
  drunk: { label: "Drunk", emoji: "🍺", bubble: "hic!" },
  tired: { label: "Tired", emoji: "💤", bubble: "huff..." },
  moonwalk: { label: "Moonwalk", emoji: "🕺", bubble: "Hee-hee!" },
  wrongway: { label: "Wrong way!", emoji: "🔄", bubble: "Wait... where?!" },
  stumble: { label: "Stumble", emoji: "💥", bubble: "Oof!" },
  graze: { label: "Snack break", emoji: "🌱", bubble: "Ooh, grass!" },
  nap: { label: "Power nap", emoji: "😴", bubble: "Zzz..." },
  zoomies: { label: "Zoomies", emoji: "🌀", bubble: "WHEEE!" },
  biped: { label: "Two legs!", emoji: "🏃", bubble: "ON YOUR LEFT!" },
  winded: { label: "Job done", emoji: "😮‍💨", bubble: "My work here is done." },
  rocket: { label: "ACME Rocket", emoji: "🚀", bubble: "SEE YA CHUMPS!" },
  ufo: { label: "Abducted!", emoji: "🛸", bubble: "Take me to your leader!" },
  skate: { label: "Hoverboard", emoji: "🛹", bubble: "RADICAL!" },
  exploded: { label: "KA-BOOM!", emoji: "💥", bubble: "...ow." },
  wiped: { label: "Board snapped!", emoji: "🤕", bubble: "My face!!" },
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
    case "stumble": return base * 0.2;
    case "graze": return 0;
    case "nap": return 0;
    case "biped": return base * 1.9;
    case "winded": return base * 0.45;
    case "rocket": return base * 2.8;
    case "ufo": return base * 0.05;
    case "skate": return base * 1.6 * sprint;
    case "exploded": return 0;
    case "wiped": return base * 0.1;
    case "zoomies": return base * (1.2 + Math.sin(t * 9) * 1.1);
    default: return base * sprint;
  }
}

/** Surprises are rare: most rolls keep the horse galloping normally. */
export function randomState(rand: () => number = Math.random, leading = false, previous: HorseState = "normal"): HorseState {
  const r = rand();
  if (leading) {
    if (r < (previous === "turbo" ? 0.8 : 0.55)) {
      const mishaps: HorseState[] = ["wrongway", "moonwalk", "nap", "stumble", "graze"];
      if (r < 0.3) return "ufo";
      return mishaps[Math.floor(rand() * mishaps.length)] ?? "nap";
    }
    return "normal";
  }
  if (r < 0.45) return "normal";
  const specials: HorseState[] = ["turbo", "drunk", "tired", "moonwalk", "wrongway", "stumble", "graze", "nap", "zoomies", "rocket", "skate", "ufo"];
  return specials[Math.floor(rand() * specials.length)] ?? "normal";
}

/** Auto-follow advances only; manual scrolling deliberately bypasses this rule. */
export function forwardCamera(current: number, target: number, maximum: number): number {
  return Math.min(maximum, Math.max(current, target, 0));
}

/** Seconds a special status lasts before the horse snaps back to normal. */
export function durationFor(state: HorseState): number {
  if (state === "ufo") return 2.2;
  if (state === "exploded") return 2;
  if (state === "wiped") return 1.6;
  if (state === "rocket") return 1.6;
  if (state === "stumble") return 1.2;
  if (state === "graze") return 1.6;
  if (state === "wrongway" || state === "moonwalk") return 1.6;
  if (state === "nap") return 1.8;
  return 2.2;
}

/** Chance per roll that the last-place horse stands up and runs on two legs. */
export const BIPED_CHANCE = 0.8;

/** Rush states that burn a horse out when they end. */
export const RUSH_STATES: HorseState[] = ["turbo", "zoomies", "biped", "rocket", "skate"];
/** Chance a horse crashes into a comic mishap right after a rush. */
export const BURNOUT_CHANCE = 0.75;
export const BURNOUTS: HorseState[] = ["graze", "nap", "wrongway", "moonwalk", "stumble", "tired"];

/** After sprinting too hard a horse usually pays for it with a funny crash. */
export function burnoutState(rand: () => number, previous: HorseState): HorseState | null {
  // gadgets always fail spectacularly
  if (previous === "rocket") return "exploded";
  if (previous === "skate") return "wiped";
  if (!RUSH_STATES.includes(previous) || rand() >= BURNOUT_CHANCE) return null;
  return BURNOUTS[Math.floor(rand() * BURNOUTS.length)] ?? "graze";
}

/** Horses behind the leader fight back: they often push with a turbo surge. */
export function chaserState(rand: () => number): HorseState {
  const r = rand();
  if (r < 0.3) return "turbo";
  if (r < 0.45) return "rocket";
  if (r < 0.58) return "skate";
  if (r < 0.68) return "zoomies";
  if (r < 0.78) return "drunk";
  return "normal";
}

/** Only the trailing horse (with someone ahead to catch) can switch to a two-legged run. */
export function rollBiped(rand: () => number, isLast: boolean, progress: number): boolean {
  return isLast && progress >= 0.1 && progress < 0.95 && rand() < BIPED_CHANCE;
}

/** The two-legged run ends the moment the horse gets ahead of the horse it was chasing. */
export function bipedDone(myX: number, targetX: number): boolean {
  return myX > targetX;
}

/** Drafting behind a rival a short way ahead gives a speed boost. */
export function draftBoost(gapAhead: number): number {
  return gapAhead > 30 && gapAhead < 140 ? 1.18 : 1;
}
