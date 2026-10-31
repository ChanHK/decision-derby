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
      banana: [900, 600, 180, 95], nap: [220, 165, 130],
      victory: [523, 659, 784, 1047, 784, 1047],
    };
    const melody = notes[sound];
    if (!melody) return;
    melody.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.12;
      oscillator.type = sound === "banana" ? "sawtooth" : "triangle";
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