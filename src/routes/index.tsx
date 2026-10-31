import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { STATE_INFO, randomState, speedFor, type HorseState } from "@/lib/race";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Derby Decider — Let horses make your decision" },
      { name: "description", content: "Enter up to 5 choices and watch cartoon horses race with surprise events to pick your decision." },
      { property: "og:title", content: "Derby Decider" },
      { property: "og:description", content: "A horse race that makes your decisions for you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const COATS = ["var(--horse-1)", "var(--horse-2)", "var(--horse-3)", "var(--horse-4)", "var(--horse-5)"];
const TRACK = 2400; // world px
const FINISH = 2200;
const START = 120;

type Phase = "setup" | "pan" | "countdown" | "race" | "done";
type H = { x: number; state: HorseState; next: number; base: number; finish?: number };

function Horse({ color, state, running }: { color: string; state: HorseState; running: boolean }) {
  const dur = state === "turbo" ? "0.18s" : state === "tired" ? "0.7s" : "0.32s";
  return (
    <svg viewBox="0 0 120 80" width="110" height="74"
      className={state === "drunk" ? "horse-wobble" : ""}
      style={{ ["--leg" as string]: running ? dur : "0s", overflow: "visible" }}>
      <g className={running ? "horse-bob" : ""}>
        {[[38, 0], [48, 1], [80, 1], [90, 0]].map(([lx, alt], i) => (
          <rect key={i} x={lx} y={48} width="7" height="26" rx="3" fill={color} stroke="var(--ink)" strokeWidth="2.5"
            className={running ? (alt ? "leg-b" : "leg-a") : ""} style={{ transformOrigin: `${lx + 3.5}px 50px` }} />
        ))}
        <path d="M30 40 Q18 30 10 46 Q20 44 28 50" fill="var(--ink)" />
        <ellipse cx="64" cy="44" rx="36" ry="17" fill={color} stroke="var(--ink)" strokeWidth="3" />
        <path d="M88 36 L100 12 L116 20 L110 32 L98 46 Z" fill={color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M90 34 Q94 16 102 10" stroke="var(--ink)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="106" cy="20" r="2.5" fill="var(--ink)" />
        <path d="M100 12 L102 4 L106 12" fill={color} stroke="var(--ink)" strokeWidth="2.5" />
        <rect x="56" y="22" width="18" height="10" rx="3" fill="var(--saddle)" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx="65" cy="14" r="7" fill="var(--jockey)" stroke="var(--ink)" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

function Index() {
  const [choices, setChoices] = useState<string[]>(["Pizza", "Sushi", "Tacos"]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState(3);
  const [horses, setHorses] = useState<H[]>([]);
  const [cam, setCam] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [vw, setVw] = useState(1000);
  const viewRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<H[]>([]);
  const valid = choices.map((c) => c.trim()).filter(Boolean);

  useEffect(() => {
    const m = () => setVw(viewRef.current?.clientWidth ?? 1000);
    m(); window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, [phase]);

  const maxCam = Math.max(0, TRACK - vw);

  function start() {
    if (valid.length < 2) return;
    setChoices(valid);
    hRef.current = valid.map(() => ({ x: START, state: "normal", next: 1 + Math.random() * 2, base: 150 + Math.random() * 20 }));
    setHorses([...hRef.current]);
    setOrder([]);
    setPhase("pan");
  }

  // pan finish -> start
  useEffect(() => {
    if (phase !== "pan") return;
    let raf = 0; const t0 = performance.now(); const D = 2600;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / D);
      const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      setCam(maxCam * (1 - e));
      if (p < 1) raf = requestAnimationFrame(step); else { setCount(3); setPhase("countdown"); }
    };
    setCam(maxCam);
    const id = setTimeout(() => (raf = requestAnimationFrame(step)), 700);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, [phase, maxCam]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { const id = setTimeout(() => setPhase("race"), 600); return () => clearTimeout(id); }
    const id = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "race") return;
    let raf = 0; let last = performance.now(); let t = 0; const fin: number[] = [];
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      for (let i = 0; i < hRef.current.length; i++) {
        const h = hRef.current[i];
        if (h.finish !== undefined) { h.x += 60 * dt; continue; }
        if (t > h.next) { h.state = randomState(); h.next = t + 1.2 + Math.random() * 2; }
        h.x = Math.max(START - 40, h.x + speedFor(h.state, t + i, h.base) * dt);
        if (h.x >= FINISH) { h.finish = t; fin.push(i); }
      }
      setHorses(hRef.current.map((h) => ({ ...h })));
      const lead = Math.max(...hRef.current.map((h) => h.x));
      setCam(Math.min(maxCam, Math.max(0, lead - vw * 0.6)));
      if (fin.length === hRef.current.length) { setOrder([...fin]); setTimeout(() => setPhase("done"), 900); return; }
      if (fin.length && !order.length) setOrder([...fin]);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "setup") {
    return (
      <main className="min-h-screen grass-bg flex items-center justify-center p-4">
        <div className="cartoon-card w-full max-w-lg p-6">
          <h1 className="font-display text-5xl text-center text-primary">Derby Decider</h1>
          <p className="text-center text-muted-foreground mt-1">Can't decide? Let the horses race for it.</p>
          <div className="mt-6 space-y-3">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full border-[3px] border-ink shrink-0" style={{ background: COATS[i] }} />
                <input value={c} maxLength={30} placeholder={`Choice ${i + 1}`}
                  onChange={(e) => setChoices(choices.map((x, j) => (j === i ? e.target.value : x)))}
                  className="flex-1 rounded-xl border-[3px] border-ink bg-card px-3 py-2 font-bold outline-none focus:ring-4 ring-accent" />
                {choices.length > 2 && (
                  <button onClick={() => setChoices(choices.filter((_, j) => j !== i))} aria-label="Remove"
                    className="cartoon-btn bg-secondary px-3 py-2">✕</button>
                )}
              </div>
            ))}
          </div>
          {choices.length < 5 && (
            <button onClick={() => setChoices([...choices, ""])} className="mt-3 w-full rounded-xl border-[3px] border-dashed border-ink py-2 font-bold text-muted-foreground">+ Add choice</button>
          )}
          <button disabled={valid.length < 2} onClick={start} className="cartoon-btn mt-6 w-full bg-primary text-primary-foreground py-3 text-2xl font-display disabled:opacity-50">
            And they're off! 🏁
          </button>
          {valid.length < 2 && <p className="text-center text-sm mt-2 text-muted-foreground">Enter at least 2 choices.</p>}
        </div>
      </main>
    );
  }

  const winner = order[0];
  return (
    <main className="min-h-screen grass-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="font-display text-3xl text-primary">Derby Decider</h1>
        <span className="font-bold text-foreground/80">{phase === "pan" ? "Surveying the track…" : phase === "race" ? "Race on!" : ""}</span>
      </header>
      <div className="flex flex-1 px-2 pb-4 gap-2">
        {/* labels column */}
        <aside className="w-36 sm:w-48 shrink-0 flex flex-col pt-10">
          {choices.map((c, i) => {
            const h = horses[i]; const place = order.indexOf(i);
            return (
              <div key={i} className="h-24 flex items-center">
                <div className="cartoon-card w-full p-2 flex items-center gap-2" style={{ borderLeft: `10px solid ${COATS[i]}` }}>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{c}</div>
                    <div className="text-xs text-muted-foreground">
                      {place >= 0 ? `🏁 #${place + 1}` : h ? `${STATE_INFO[h.state].emoji} ${STATE_INFO[h.state].label}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </aside>
        {/* track viewport */}
        <div ref={viewRef} className="relative flex-1 overflow-hidden rounded-2xl border-[4px] border-ink">
          <div className="absolute top-0 left-0 h-full" style={{ width: TRACK, transform: `translateX(${-cam}px)` }}>
            <div className="h-10 crowd-bg" />
            {choices.map((_, i) => (
              <div key={i} className="relative h-24 dirt-bg border-b-[3px] border-dashed border-track-line" />
            ))}
            {/* start gates */}
            <div className="absolute top-10 bottom-0" style={{ left: START + 30 }}>
              {choices.map((_, i) => (
                <div key={i} className="h-24 w-4 bg-gate border-x-[3px] border-ink transition-transform duration-500 origin-top"
                  style={{ transform: phase === "race" || phase === "done" ? "scaleY(0.05)" : "none" }} />
              ))}
            </div>
            <div className="absolute top-10 bottom-0 w-5 finish-line" style={{ left: FINISH + 100 }} />
            <div className="absolute top-1 font-display text-xl text-primary-foreground bg-primary px-2 rounded" style={{ left: FINISH + 60 }}>FINISH</div>
            {horses.map((h, i) => (
              <div key={i} className="absolute" style={{ top: 40 + i * 96 + 14, left: h.x, transition: "none" }}>
                <Horse color={COATS[i]} state={h.state} running={phase === "race" || (phase === "done")} />
                {phase === "race" && h.state !== "normal" && h.finish === undefined && (
                  <span className="absolute -top-3 left-8 text-xl animate-bounce">{STATE_INFO[h.state].emoji}</span>
                )}
              </div>
            ))}
          </div>
          {phase === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span key={count} className="font-display text-9xl text-accent countdown-pop drop-shadow">{count || "GO!"}</span>
            </div>
          )}
        </div>
      </div>

      {phase === "done" && winner !== undefined && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-20">
          <Confetti />
          <div className="cartoon-card relative w-full max-w-lg p-6 text-center">
            <p className="font-bold text-muted-foreground">The horses have decided…</p>
            <h2 className="font-display text-5xl text-primary mt-1 break-words">{choices[winner]}</h2>
            <div className="flex items-end justify-center gap-3 mt-6">
              {[1, 0, 2].map((p) => order[p] !== undefined && (
                <div key={p} className="flex flex-col items-center w-28">
                  <div className="scale-75"><Horse color={COATS[order[p]]} state="normal" running={false} /></div>
                  <div className="text-sm font-bold truncate w-full">{choices[order[p]]}</div>
                  <div className="w-full rounded-t-lg border-[3px] border-ink bg-secondary font-display text-3xl flex items-center justify-center"
                    style={{ height: p === 0 ? 96 : p === 1 ? 66 : 44, background: p === 0 ? "var(--gold)" : undefined }}>{p + 1}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={start} className="cartoon-btn bg-primary text-primary-foreground py-3 font-display text-xl">Race again</button>
              <button onClick={() => setPhase("setup")} className="cartoon-btn bg-secondary py-3 font-display text-xl">Edit choices</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((i) => (
        <span key={i} className="confetti" style={{
          left: `${(i * 37) % 100}%`, background: COATS[i % 5],
          animationDelay: `${(i % 10) * 0.15}s`, animationDuration: `${2 + (i % 5) * 0.4}s`,
        }} />
      ))}
    </div>
  );
}
