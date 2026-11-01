import { useEffect, useRef, useState, type ReactNode } from "react";
import { canRaceHorizontally, isRotated } from "@/lib/landscape";

/** Phones and small tablets held upright: wide enough to be a phone, tall enough to hurt the track. */
const PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 900px)";

export type Landscape = {
  /** The device is being held upright. */
  portrait: boolean;
  /** The user asked us to draw the race sideways ourselves. */
  forced: boolean;
  /** The stage is being drawn rotated 90°. */
  rotated: boolean;
  /** The race can be watched across the screen. */
  horizontal: boolean;
  /** Ask the device to rotate; if it won't, draw the race sideways instead. */
  playSideways: () => Promise<void>;
};

export function useLandscape(): Landscape {
  const [portrait, setPortrait] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  async function playSideways() {
    // Ask the device to rotate for real when it can (Android does); everything else
    // gets the CSS fallback below, which draws the race sideways on an upright phone.
    type Lockable = { lock?: (t: string) => Promise<void> };
    const o = (screen as unknown as { orientation?: Lockable }).orientation;
    if (o?.lock) {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        await o.lock("landscape");
      } catch {
        // The device refused to turn — the CSS fallback still gives a sideways race.
      }
    }
    setForced(true);
  }

  return {
    portrait,
    forced,
    rotated: isRotated({ portrait, forced }),
    horizontal: canRaceHorizontally({ portrait, forced }),
    playSideways,
  };
}

/**
 * The box the race is played in: the whole screen upright, or that same screen
 * turned 90° when the phone refuses to rotate itself.
 */
export function Stage({ rotated = false, children }: { rotated?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // A sideways stage must never leak scroll to the page behind it.
    el.scrollTo(0, 0);
  }, [rotated]);

  return (
    <div ref={ref} className={rotated ? "stage stage-rotated" : "stage"}>
      {children}
    </div>
  );
}

/** Upright-phone prompt: turn the device, or let us draw the race sideways. */
export function LandscapeGate({ onPlay, onDismiss }: { onPlay: () => void; onDismiss: () => void }) {
  return (
    <div className="stage-gate" role="dialog" aria-modal="true" aria-label="Turn your phone sideways">
      <div className="cartoon-card stage-gate-card p-5 text-center">
        <svg viewBox="0 0 120 120" className="phone-turn mx-auto h-20 w-20" aria-hidden="true">
          <rect x="36" y="16" width="48" height="88" rx="9" fill="var(--card)" stroke="var(--ink)" strokeWidth="5" />
          <rect x="44" y="27" width="32" height="62" rx="3" fill="var(--grass)" stroke="var(--ink)" strokeWidth="3" />
          <circle cx="60" cy="97" r="4" fill="var(--ink)" />
        </svg>
        <h2 className="font-display text-3xl text-primary mt-2">Turn your phone sideways</h2>
        <p className="font-bold text-muted-foreground mt-1">
          The track is wider than it is tall — sideways you see the whole race.
        </p>
        <button onClick={onPlay} className="cartoon-btn mt-4 w-full bg-primary text-primary-foreground py-3 font-display text-xl">
          Play sideways anyway
        </button>
        <button onClick={onDismiss} className="mt-2 w-full py-2 font-bold text-muted-foreground underline">
          Keep watching this way
        </button>
      </div>
    </div>
  );
}

const SHORT_QUERY = "(max-height: 620px)";

/** True when the screen is too short for a full-size results card (a phone held sideways). */
export function useShortScreen(): boolean {
  const [short, setShort] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(SHORT_QUERY);
    const on = () => setShort(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return short;
}
