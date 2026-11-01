import type { HorseState } from "./race";
import horn from "@/assets/race_start_horn.mp3.asset.json";
import beep3 from "@/assets/440hz.mp3.asset.json";
import beep2 from "@/assets/550hz.mp3.asset.json";
import beep1 from "@/assets/660hz.mp3.asset.json";
import go from "@/assets/gates_open_go.mp3.asset.json";

type Sound = HorseState | "victory";
export type Clip = "horn" | "count3" | "count2" | "count1" | "go";
const CLIPS: Record<Clip, string> = { horn: horn.url, count3: beep3.url, count2: beep2.url, count1: beep1.url, go: go.url };

/** Short, original cartoon cues synthesized locally plus uploaded countdown clips. */
export class RaceSound {
  private context: AudioContext | undefined;
  private voices = new Set<OscillatorNode>();
  private buffers = new Map<Clip, Promise<AudioBuffer | undefined>>();
  private enabled = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      for (const voice of this.voices) { try { voice.stop(); } catch { /* already ended */ } }
      this.voices.clear();
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

  playClip(clip: Clip) {
    const ctx = this.context;
    if (!this.enabled || !ctx) return;
    void this.buffers.get(clip)?.then((buf) => {
      if (!buf || !this.enabled) return;
      void ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      const gain = ctx.createGain(); gain.gain.value = 0.8;
      src.buffer = buf; src.connect(gain); gain.connect(ctx.destination);
      src.onended = () => { src.disconnect(); gain.disconnect(); };
      src.start();
    });
  }

  play(sound: Sound) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== "running") return;
    const notes: Partial<Record<Sound, number[]>> = {
      moonwalk: [440, 330, 392, 294], wrongway: [650, 480, 310],
      stumble: [300, 180, 110], graze: [520, 600, 520, 600], nap: [220, 165, 130], biped: [392, 494, 392, 494, 587],
      exploded: [180, 120, 80, 60], wiped: [900, 300, 700, 200], ufo: [600, 900, 700, 1000, 800],
      timeout: [440, 220, 440, 220], standby: [784, 659, 523], smash: [300, 1200, 1600],
      glassdoor: [1400, 1800, 200, 120], soup: [300, 380, 300, 380, 300], tactile: [700, 900, 700, 900],
      jet: [200, 400, 800, 1600], scuba: [500, 700, 450, 750, 400], laksa: [1200, 1500, 1200, 1500, 1800],
      copter: [150, 150, 150, 150, 150, 150], lunge: [1800, 2200, 1800],
      victory: [523, 659, 784, 1047, 784, 1047],
    };
    const melody = notes[sound];
    if (!melody) return;
    melody.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      oscillator.type = sound === "stumble" || sound === "exploded" || sound === "wiped" || sound === "timeout" || sound === "glassdoor" || sound === "copter" || sound === "jet" ? "square" : "triangle";
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