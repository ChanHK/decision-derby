import type { HorseState } from "./race";

type Sound = HorseState | "victory";

/** Short, original cartoon cues synthesized locally; no downloads or server calls. */
export class RaceSound {
  private context: AudioContext | undefined;
  private voices = new Set<OscillatorNode>();
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
    } catch { this.enabled = false; }
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