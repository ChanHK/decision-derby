/** Pure, browser-safe helpers for the sideways (horizontal) race stage. */

/** One lane, in world px. */
export const LANE_H = 150;
/** Sky, crowd strip and rails above and below the lanes, in world px. */
export const TRACK_CHROME = 116 + 26 + 18;
/** Mini-map strip and gaps that sit above the track inside its column. */
export const COLUMN_CHROME = 44;
/** Smallest scale we will shrink the track to; below this the horses are unreadable. */
export const MIN_FIT = 0.4;

/** World height of the whole track for a given number of lanes. */
export function trackHeight(lanes: number): number {
  return TRACK_CHROME + Math.max(1, lanes) * LANE_H;
}

/**
 * Uniform scale that makes the track fit the height we have.
 * Never upscales: a tall window keeps the track at its natural size.
 */
export function fitScale(availH: number, trackH: number): number {
  if (!Number.isFinite(availH) || !Number.isFinite(trackH) || availH <= 0 || trackH <= 0) return 1;
  const f = availH / trackH;
  return f >= 1 ? 1 : Math.max(MIN_FIT, f);
}

/** True when the race can be shown across the screen: already sideways, or forced sideways. */
export function canRaceHorizontally(o: { portrait: boolean; forced: boolean }): boolean {
  return !o.portrait || o.forced;
}

/** True when the stage should draw itself rotated 90° because the device won't. */
export function isRotated(o: { portrait: boolean; forced: boolean }): boolean {
  return o.portrait && o.forced;
}

/** True when the "turn your phone sideways" prompt should be up. */
export function showGate(o: {
  portrait: boolean;
  forced: boolean;
  dismissed: boolean;
  started: boolean;
  pending: boolean;
}): boolean {
  if (!o.portrait || o.forced || o.dismissed) return false;
  return o.pending || o.started;
}
