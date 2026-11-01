import type { HorseState } from "./race";
import launch from "@/assets/race-launch.mp3.asset.json";
import tone3 from "@/assets/440hz.mp3.asset.json";
import tone2 from "@/assets/550hz.mp3.asset.json";
import tone1 from "@/assets/660hz.mp3.asset.json";
import go from "@/assets/gates_open_go.mp3.asset.json";
import hoofbeats from "@/assets/race-hoofbeats.mp3.asset.json";
import ufo from "@/assets/race-ufo.mp3.asset.json";
import detonation from "@/assets/race-detonation.mp3.asset.json";
import decision from "@/assets/race-decision.mp3.asset.json";
import rocket from "@/assets/race-rocket.mp3.asset.json";
import scuba from "@/assets/race-scuba.mp3.asset.json";
import biped from "@/assets/race-biped.mp3.asset.json";
import copter from "@/assets/race-copter.mp3.asset.json";
import jet from "@/assets/race-jet.mp3.asset.json";
import lunge from "@/assets/race-lunge.mp3.asset.json";
import wiped from "@/assets/race-wiped.mp3.asset.json";
import nap from "@/assets/race-nap.mp3.asset.json";
import graze from "@/assets/race-graze.mp3.asset.json";
import stumble from "@/assets/race-stumble.mp3.asset.json";
import tactile from "@/assets/race-tactile.mp3.asset.json";
import turbo from "@/assets/race-turbo.mp3.asset.json";

export type Clip = "launch" | "tone3" | "tone2" | "tone1" | "go" | "hoofbeats" | "ufo" | "detonation" | "decision" | "rocket" | "scuba" | "biped" | "copter" | "jet" | "lunge" | "wiped" | "nap" | "graze" | "stumble" | "tactile" | "turbo";
const CLIPS: Record<Clip, string> = {
  launch: launch.url, tone3: tone3.url, tone2: tone2.url, tone1: tone1.url, go: go.url,
  hoofbeats: hoofbeats.url, ufo: ufo.url, detonation: detonation.url, decision: decision.url,
  rocket: rocket.url, scuba: scuba.url, biped: biped.url, copter: copter.url, jet: jet.url, lunge: lunge.url,
  wiped: wiped.url, nap: nap.url, graze: graze.url, stumble: stumble.url, tactile: tactile.url, turbo: turbo.url,
};

const STATE_LOOPS: Partial<Record<HorseState, Clip>> = {
  ufo: "ufo", rocket: "rocket", scuba: "scuba", biped: "biped", copter: "copter", jet: "jet", nap: "nap",
  graze: "graze", stumble: "stumble", winded: "stumble", tactile: "tactile", turbo: "turbo", zoomies: "turbo",
};

/** Only replacement uploads; constructed without touching browser APIs until a user gesture. */
export class RaceSound {
  private context: AudioContext | undefined;
  private sources = new Set<AudioBufferSourceNode>();
  private loops = new Map<string, AudioBufferSourceNode>();
  private pendingLoops = new Map<string, object>();
  private buffers = new Map<Clip, Promise<AudioBuffer | undefined>>();
  private enabled = false;
  private generation = 0;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) { this.stopAll(); return; }
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
      this.loadClips();
    } catch { this.enabled = false; }
  }

  private loadClips() {
    const ctx = this.context;
    if (!ctx || this.buffers.size) return;
    for (const [name, url] of Object.entries(CLIPS) as [Clip, string][]) {
      this.buffers.set(name, fetch(url).then((r) => {
        if (!r.ok) throw new Error("Sound unavailable");
        return r.arrayBuffer();
      }).then((b) => ctx.decodeAudioData(b)).catch(() => undefined));
    }
  }

  async playClip(clip: Clip, opts: { loop?: boolean; volume?: number; key?: string } = {}) {
    const ctx = this.context;
    if (!this.enabled || !ctx) return;
    const key = opts.key ?? clip;
    if (opts.loop && (this.loops.has(key) || this.pendingLoops.has(key))) return;
    const generation = this.generation;
    const token = {};
    if (opts.loop) this.pendingLoops.set(key, token);
    const buffer = await this.buffers.get(clip);
    if (!buffer || !this.enabled || generation !== this.generation) return;
    if (opts.loop && this.pendingLoops.get(key) !== token) return;
    if (opts.loop) this.pendingLoops.delete(key);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain(); gain.gain.value = opts.volume ?? 0.8;
    src.buffer = buffer; src.loop = !!opts.loop;
    src.connect(gain); gain.connect(ctx.destination);
    this.sources.add(src);
    if (opts.loop) this.loops.set(key, src);
    src.onended = () => {
      this.sources.delete(src);
      if (this.loops.get(key) === src) this.loops.delete(key);
      src.disconnect(); gain.disconnect();
    };
    src.start();
  }

  stopLoop(key: string) {
    this.pendingLoops.delete(key);
    const src = this.loops.get(key);
    this.loops.delete(key);
    try { src?.stop(); } catch { /* already ended */ }
  }

  /** Each horse owns its own channel: its state sound loops while the state lasts and stops the moment it ends. */
  syncRace(states: readonly HorseState[], racing: boolean) {
    if (racing) void this.playClip("hoofbeats", { loop: true, volume: 0.45 });
    else this.stopLoop("hoofbeats");
    const wanted = new Set<string>();
    if (racing) states.forEach((state, i) => {
      const clip = STATE_LOOPS[state];
      if (!clip) return;
      const key = `horse${i}:${clip}`;
      wanted.add(key);
      void this.playClip(clip, { loop: true, volume: clip === "ufo" ? 0.65 : 0.6, key });
    });
    for (const key of [...this.loops.keys(), ...this.pendingLoops.keys()]) {
      if (key.startsWith("horse") && !wanted.has(key)) this.stopLoop(key);
    }
  }

  /** One-shot impacts only; ongoing state sounds are handled per horse by syncRace. */
  play(sound: HorseState | "victory") {
    if (sound === "exploded") void this.playClip("detonation");
    if (sound === "wiped") void this.playClip("wiped");
    if (sound === "victory") void this.playClip("decision");
  }

  stopAll() {
    this.generation++;
    this.pendingLoops.clear();
    for (const src of this.sources) { try { src.stop(); } catch { /* already ended */ } }
    this.sources.clear(); this.loops.clear();
  }

  dispose() { this.setEnabled(false); void this.context?.close(); }
}
