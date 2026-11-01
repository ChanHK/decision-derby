import type { HorseState } from "./race";
import horn from "@/assets/race_start_horn.mp3.asset.json";
import beep3 from "@/assets/440hz.mp3.asset.json";
import beep2 from "@/assets/550hz.mp3.asset.json";
import beep1 from "@/assets/660hz.mp3.asset.json";
import go from "@/assets/gates_open_go.mp3.asset.json";
import gallop from "@/assets/horse_gallop_sound.mp3.asset.json";
import wind from "@/assets/Speedlines_Wind.mp3.asset.json";
import patter from "@/assets/cartoon_pitter_platter.mp3.asset.json";
import acme from "@/assets/acme.mp3.asset.json";
import hover from "@/assets/hoverboard.mp3.asset.json";
import turbines from "@/assets/twin_turbines.mp3.asset.json";
import scuba from "@/assets/scuba.mp3.asset.json";
import laksa from "@/assets/laksa.mp3.asset.json";
import copter from "@/assets/copter.mp3.asset.json";
import lunge from "@/assets/court_lunge.mp3.asset.json";

type Sound = HorseState | "victory";
export type Clip =
  | "horn" | "count3" | "count2" | "count1" | "go" | "gallop" | "wind"
  | "biped" | "rocket" | "skate" | "jet" | "scuba" | "laksa" | "copter" | "lunge";
const CLIPS: Record<Clip, string> = {
  horn: horn.url, count3: beep3.url, count2: beep2.url, count1: beep1.url, go: go.url,
  gallop: gallop.url, wind: wind.url,
  biped: patter.url, rocket: acme.url, skate: hover.url, jet: turbines.url,
  scuba: scuba.url, laksa: laksa.url, copter: copter.url, lunge: lunge.url,
};
/** Race states that use an uploaded clip instead of a synthesized melody. */
const STATE_CLIPS: Partial<Record<Sound, Clip>> = {
  biped: "biped", rocket: "rocket", skate: "skate", jet: "jet", scuba: "scuba",
  laksa: "laksa", copter: "copter", lunge: "lunge", turbo: "wind", zoomies: "wind",
};

/** Uploaded clips for countdown, locomotion and gadgets plus synthesized cartoon cues. */
export class RaceSound {
  private context: AudioContext | undefined;
  private voices = new Set<OscillatorNode>();
  private sources = new Set<AudioBufferSourceNode>();
  private loops = new Map<Clip, AudioBufferSourceNode>();
  private buffers = new Map<Clip, Promise<AudioBuffer | undefined>>();
  private lastPlayed = new Map<Clip, number>();
  private enabled = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      for (const voice of this.voices) { try { voice.stop(); } catch { /* already ended */ } }
      for (const src of this.sources) { try { src.stop(); } catch { /* already ended */ } }
      this.voices.clear(); this.sources.clear(); this.loops.clear();
      return;
    }
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
      this.buffers.set(name, fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => undefined));
    }
  }

  playClip(clip: Clip, opts: { loop?: boolean; volume?: number; minGap?: number } = {}) {
    const ctx = this.context;
    if (!this.enabled || !ctx) return;
    if (opts.loop && this.loops.has(clip)) return;
    const now = performance.now();
    if (opts.minGap && now - (this.lastPlayed.get(clip) ?? -Infinity) < opts.minGap) return;
    this.lastPlayed.set(clip, now);
    void this.buffers.get(clip)?.then((buf) => {
      if (!buf || !this.enabled) return;
      if (opts.loop && this.loops.has(clip)) return;
      void ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      const gain = ctx.createGain(); gain.gain.value = opts.volume ?? 0.8;
      src.buffer = buf; src.loop = !!opts.loop;
      src.connect(gain); gain.connect(ctx.destination);
      this.sources.add(src);
      if (opts.loop) this.loops.set(clip, src);
      src.onended = () => {
        this.sources.delete(src);
        if (this.loops.get(clip) === src) this.loops.delete(clip);
        src.disconnect(); gain.disconnect();
      };
      src.start();
    });
  }

  stopLoop(clip: Clip) {
    const src = this.loops.get(clip);
    this.loops.delete(clip);
    try { src?.stop(); } catch { /* already ended */ }
  }

  play(sound: Sound) {
    const clip = STATE_CLIPS[sound];
    if (clip) { this.playClip(clip, { volume: 0.7, minGap: clip === "lunge" ? 1200 : 250 }); return; }
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== "running") return;
    const notes: Partial<Record<Sound, number[]>> = {
      moonwalk: [440, 330, 392, 294], wrongway: [650, 480, 310],
      stumble: [300, 180, 110], graze: [520, 600, 520, 600], nap: [220, 165, 130],
      exploded: [180, 120, 80, 60], wiped: [900, 300, 700, 200], ufo: [600, 900, 700, 1000, 800],
      timeout: [440, 220, 440, 220], standby: [784, 659, 523], smash: [300, 1200, 1600],
      glassdoor: [1400, 1800, 200, 120], soup: [300, 380, 300, 380, 300], tactile: [700, 900, 700, 900],
      victory: [523, 659, 784, 1047, 784, 1047],
    };
    const melody = notes[sound];
    if (!melody) return;
    melody.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      oscillator.type = sound === "stumble" || sound === "exploded" || sound === "wiped" || sound === "timeout" || sound === "glassdoor" ? "square" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, frequency * (sound === "victory" ? 1 : 0.7)), start + 0.15);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      oscillator.connect(gain); gain.connect(ctx.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start); oscillator.stop(start + 0.22);
    });
  }

  dispose() { this.setEnabled(false); void this.context?.close(); }
}
