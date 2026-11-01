export type HorseState = "normal" | "turbo" | "drunk" | "tired" | "moonwalk" | "wrongway" | "stumble" | "graze" | "nap" | "zoomies" | "biped" | "winded" | "rocket" | "ufo" | "skate" | "exploded" | "wiped" | "timeout" | "standby" | "smash" | "glassdoor" | "soup" | "tactile" | "jet" | "scuba" | "laksa" | "copter" | "lunge";

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
  timeout: { label: "System crash", emoji: "⏳", bubble: "504 Gateway Timeout..." },
  standby: { label: "Standby list", emoji: "⌚", bubble: "Waiting on ID90 clearance..." },
  smash: { label: "Jump smash", emoji: "🏸", bubble: "SMASH!" },
  glassdoor: { label: "Glass door!", emoji: "🚪", bubble: "Who cleaned that glass?!" },
  soup: { label: "Soup break", emoji: "🍲", bubble: "Wait, this broth is actually incredible." },
  tactile: { label: "Squishy toy", emoji: "🫧", bubble: "So squishy..." },
  jet: { label: "Jet engine", emoji: "✈️", bubble: "Cleared for departure!" },
  scuba: { label: "Scuba torpedo", emoji: "🤿", bubble: "Current is strong today!" },
  laksa: { label: "Spicy laksa", emoji: "🌶️", bubble: "TOO SPICY TOO SPICY TOO SPICY!" },
  copter: { label: "Fidget copter", emoji: "🌀", bubble: "Who needs aerodynamics?!" },
  lunge: { label: "Court lunge", emoji: "🏸", bubble: "Footwork is everything!" },
};

/** Underdog comeback boosts (picked evenly). */
export const PANIC_POOL: HorseState[] = ["biped", "rocket", "skate", "jet", "scuba", "laksa", "copter", "lunge"];
/** Boosts that move by their own speed instead of the flat panic multiplier. */
export const SELF_SPEED: HorseState[] = ["jet", "scuba", "laksa", "copter", "lunge"];
/** Court lunge: seconds per lunge and how far each snap jumps (share of screen width). */
export const LUNGE_EVERY = 0.6;
export const LUNGE_SNAP = 0.2;

/** The six Leader's Curse penalties: each halts the runaway leader with a puppet-rig gag. */
export const LEADER_CURSES: HorseState[] = ["timeout", "standby", "smash", "glassdoor", "soup", "tactile"];
export const CURSE_BUBBLES: Partial<Record<HorseState, string[]>> = {
  timeout: ["504 Gateway Timeout...", "Who pushed to main?"],
  standby: ["Waiting on ID90 clearance...", "Still on the standby list!"],
  smash: ["SMASH!", "Right on the line!"],
  glassdoor: ["Who cleaned that glass?!"],
  soup: ["Wait, this broth is actually incredible."],
  tactile: ["So squishy...", "Must keep pressing..."],
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
    case "timeout": case "standby": case "smash": case "glassdoor": case "tactile": return 0;
    case "soup": return base * 0.12;
    case "wiped": return base * 0.1;
    case "jet": return base * 3;
    case "scuba": return base * 2.5;
    case "laksa": return base * 2.5;
    case "copter": return base * 2.2;
    case "lunge": return 0;
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
  if (state === "lunge") return LUNGE_EVERY * 3;
  if (state === "jet" || state === "scuba" || state === "laksa" || state === "copter") return 1.8;
  if (state === "smash") return 3;
  if (state === "timeout" || state === "standby" || state === "glassdoor" || state === "soup" || state === "tactile") return 2.6;
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

/* ---------------- Race Director ---------------- */
export type DirectorPhase = "setup" | "rubber" | "finish";
/** Progress thresholds for the director's three acts. */
export const RUBBER_AT = 0.4;
export const CHAOS_FINISH_AT = 0.85;
export const CRASH_AT = 0.95;
/** Rubber-band triggers when 1st-to-last gap exceeds this share of the screen width. */
export const RUBBER_GAP = 0.15;
/** Speed multiplier for the underdog panic run. */
export const PANIC_SPEED = 2.5;
export const CURSE_LINES = ["Let me overthink this...", "Wait, are we sure?"];
export const PANIC_LINES = ["DEADLINE PANIC!", "I HAVE MADE MY CHOICE!"];

export function directorPhase(progress: number): DirectorPhase {
  if (progress < RUBBER_AT) return "setup";
  if (progress < CHAOS_FINISH_AT) return "rubber";
  return "finish";
}
export function rubberBandActive(leaderX: number, lastX: number, screenWidth: number): boolean {
  return leaderX - lastX > screenWidth * RUBBER_GAP;
}
export function leaderCurse(rand: () => number): HorseState {
  return LEADER_CURSES[Math.min(LEADER_CURSES.length - 1, Math.floor(rand() * LEADER_CURSES.length))]!;
}
/** Equal pick from all 8 boosts; never repeats the horse's previous boost. */
export function underdogPanic(rand: () => number, previous?: HorseState): HorseState {
  const pool = PANIC_POOL.filter((s) => s !== previous);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]!;
}
/** Mid-pack: half the time any of the 8 boosts, otherwise a silly gag. */
export function midPackChaos(rand: () => number, previous?: HorseState): HorseState {
  if (rand() < 0.5) return underdogPanic(rand, previous);
  const gags: HorseState[] = ["drunk", "moonwalk", "wrongway"];
  return gags[Math.min(gags.length - 1, Math.floor(rand() * gags.length))]!;
}
/** Final stretch: stalls/gags are purged so everyone sprints; mounts and crashes stay. */
export function finishPurge(state: HorseState): HorseState {
  return state === "rocket" || state === "skate" || state === "exploded" || state === "wiped" ? state : "normal";
}
/** Mounts still being ridden 5% before the line must crash. */
export function crashFinish(state: HorseState, progress: number): HorseState {
  if (progress < CRASH_AT) return state;
  if (state === "rocket") return "exploded";
  if (state === "skate") return "wiped";
  return state;
}
