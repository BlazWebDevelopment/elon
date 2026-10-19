"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LawnGame as Engine, drawItem, type Hud, type ItemKind } from "@/lib/lawn-game";
import { FIRED_SUB, pick } from "@/lib/quotes";

const BEST_KEY = "mlga-best";
const BEST_EVENT = "mlga-best";

const bestStore = {
  get: () => Number(window.localStorage.getItem(BEST_KEY)) || 0,
  set: (v: number) => {
    window.localStorage.setItem(BEST_KEY, String(v));
    window.dispatchEvent(new Event(BEST_EVENT));
  },
  subscribe: (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(BEST_EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(BEST_EVENT, cb);
    };
  },
};

const LEGEND: { kind: ItemKind; label: string; value: string }[] = [
  { kind: "burger", label: "Hamberder", value: "+10" },
  { kind: "coke", label: "Diet Coke", value: "+25" },
  { kind: "covfefe", label: "Covfefe", value: "+50" },
  { kind: "sharpie", label: "Sharpie", value: "Bigly mode" },
  { kind: "news", label: "Fake news", value: "Dodge" },
  { kind: "windmill", label: "Windmill", value: "Dodge" },
];

type Fired = { sub: string; record: boolean; score: number };

export default function LawnGame() {
  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const visibleRef = useRef(true);
  const recountRef = useRef(0);
  const [hud, setHud] = useState<Hud>({ phase: "attract", score: 0, lives: 3, combo: 0, mult: 1, big: 0 });
  const [paused, setPaused] = useState(false);
  const [fired, setFired] = useState<Fired | null>(null);
  const [recount, setRecount] = useState<{ value: number; done: boolean } | null>(null);
  const best = useSyncExternalStore(bestStore.subscribe, bestStore.get, () => 0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const engine = new Engine();
    engineRef.current = engine;
    const css = getComputedStyle(document.documentElement);
    engine.font = getComputedStyle(document.body).fontFamily;
    engine.serif = css.getPropertyValue("--font-instrument-serif").trim() || "serif";
    const img = new window.Image();
    img.src = "/trump-sticker.png";
    engine.head = img;
    engine.onHud = (h) => {
      setHud(h);
      if (h.phase === "over") {
        const prev = bestStore.get();
        const record = h.score > prev;
        if (record) bestStore.set(h.score);
        setFired((f) => f ?? { sub: pick(FIRED_SUB), record, score: h.score });
      }
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(r.width, r.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        const shouldPause = engine.phase === "play" && !entry.isIntersecting;
        engine.paused = shouldPause;
        setPaused(shouldPause);
        if (!entry.isIntersecting) engine.input.left = engine.input.right = false;
      },
      { threshold: 0.35 },
    );
    io.observe(wrap);

    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName));

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (!visibleRef.current || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (engine.phase !== "play") {
        if (down && (k === "enter" || k === " ") && engine.phase === "attract") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (k === "arrowleft" || k === "a") engine.input.left = down;
      else if (k === "arrowright" || k === "d") engine.input.right = down;
      else if (k === " " || k === "arrowup" || k === "w") {
        if (down && !e.repeat) engine.jump();
      } else if (k !== "arrowdown") return;
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => (engine.input.left = engine.input.right = false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt);
      engine.render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      window.clearInterval(recountRef.current);
      engineRef.current = null;
    };
  }, []);

  function start() {
    window.clearInterval(recountRef.current);
    setFired(null);
    setRecount(null);
    engineRef.current?.start();
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function demandRecount() {
    if (!fired || (recount && !recount.done)) return;
    const target = fired.score;
    const t0 = performance.now();
    window.clearInterval(recountRef.current);
    recountRef.current = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / 1600);
      setRecount({ value: Math.round(target * k * k), done: k >= 1 });
      if (k >= 1) window.clearInterval(recountRef.current);
    }, 40);
  }

  const hold = (dir: "left" | "right") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      if (engineRef.current) engineRef.current.input[dir] = true;
    },
    onPointerUp: () => engineRef.current && (engineRef.current.input[dir] = false),
    onPointerLeave: () => engineRef.current && (engineRef.current.input[dir] = false),
    onPointerCancel: () => engineRef.current && (engineRef.current.input[dir] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const playing = hud.phase === "play";

  return (
    <section
      id="play"
      ref={wrapRef}
      aria-label="Trump Intelligence: Make the Lawn Great Again mini game"
      className="relative h-[calc(100svh-64px)] max-h-[1000px] min-h-[620px] w-full touch-manipulation select-none overflow-hidden bg-navy"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <AnimatePresence>
        {hud.phase === "attract" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-5 pt-[clamp(24px,5svh,56px)] text-center text-white"
          >
            <p className="eyebrow flex items-center gap-3 text-amber">
              <span className="h-px w-8 bg-amber/70" />
              Live from the South Lawn
              <span className="h-px w-8 bg-amber/70" />
            </p>
            <h1 className="mt-3 font-serif text-[clamp(52px,8vw,112px)] leading-[0.9] tracking-[-0.01em] [text-shadow:0_4px_30px_rgba(13,19,45,0.6)]">
              Trump <em className="text-amber">Intelligence</em>
            </h1>
            <p className="mt-3 font-serif text-[clamp(22px,2.2vw,30px)] italic text-white/90 [text-shadow:0_2px_16px_rgba(13,19,45,0.7)]">
              Make the Lawn Great Again
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/70 sm:hidden">
              Catch hamberders, chug Diet Coke and dodge the fake news. Tremendous gameplay.
            </p>
            <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={start} className="btn btn-light h-12 px-7">
                Start the rally
                <span aria-hidden>→</span>
              </button>
              <a href="#actions" className="btn btn-outline-light h-12 bg-navy/40 px-6 backdrop-blur">
                Presidential actions
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hud.phase === "attract" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden flex-col items-center gap-2 pb-4 sm:flex">
          <ul className="flex flex-wrap justify-center gap-2 px-4">
            {LEGEND.map((l) => (
              <li
                key={l.kind}
                className={`flex items-center gap-2 border bg-navy/70 py-1 pl-1.5 pr-3 backdrop-blur ${
                  l.value === "Dodge" ? "border-red/60" : "border-white/15"
                }`}
              >
                <ItemIcon kind={l.kind} />
                <span className="text-[12px] font-semibold text-white">{l.label}</span>
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${l.value === "Dodge" ? "text-[#ff7b7b]" : "text-amber"}`}>
                  {l.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="eyebrow text-[10px] text-white/55">← → to run · Space to jump (twice for a flip) · Enter to start</p>
        </div>
      )}

      {playing && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 text-white sm:p-6">
          <div>
            <p className="eyebrow text-[10px] text-white/60">Ratings</p>
            <p className="font-serif text-[44px] leading-none tabular-nums sm:text-[56px]">{hud.score.toLocaleString("en-US")}</p>
            <p className={`eyebrow mt-1 text-[10px] transition-opacity ${hud.combo > 1 ? "text-amber opacity-100" : "opacity-0"}`}>
              Streak {hud.combo} · ×{hud.mult} bigly
            </p>
          </div>
          {hud.big > 0 && (
            <motion.p
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="eyebrow mt-2 bg-amber px-3 py-1.5 text-[11px] text-navy"
            >
              Bigly mode · {hud.big}s
            </motion.p>
          )}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <Image
                  key={i}
                  src="/trump-sticker.png"
                  alt=""
                  width={36}
                  height={35}
                  className={`h-auto w-8 transition-all duration-300 sm:w-9 ${i < hud.lives ? "" : "scale-75 opacity-25 grayscale"}`}
                />
              ))}
            </div>
            <p className="eyebrow text-[10px] text-white/60">Best {Math.max(best, hud.score).toLocaleString("en-US")}</p>
          </div>
        </div>
      )}

      {playing && (
        <div className="absolute inset-x-0 bottom-0 hidden items-end justify-between p-4 pointer-coarse:flex">
          <div className="flex gap-3">
            <TouchButton label="Run left" {...hold("left")}>
              ◀
            </TouchButton>
            <TouchButton label="Run right" {...hold("right")}>
              ▶
            </TouchButton>
          </div>
          <TouchButton
            label="Jump"
            wide
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current?.jump();
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            Jump
          </TouchButton>
        </div>
      )}

      <AnimatePresence>
        {paused && playing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-navy/60 backdrop-blur-sm"
          >
            <p className="font-serif text-4xl italic text-white">Paused. The President is in a meeting.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hud.phase === "over" && fired && (
          <motion.div
            key="fired"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="absolute inset-0 grid place-items-center bg-navy/55 px-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: 40, scale: 0.92, rotate: -2 }}
              animate={{ y: 0, scale: 1, rotate: 0 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 20 }}
              className="relative w-full max-w-md bg-white pb-7 pt-14 text-center text-navy shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-red" />
              <Image
                src="/trump-sticker.png"
                alt=""
                width={120}
                height={117}
                className="sticker absolute left-1/2 top-0 h-auto w-24 -translate-x-1/2 -translate-y-1/2 -rotate-6"
              />
              <p className="eyebrow text-[10px] text-red">Official notice of termination</p>
              <h2 className="mt-2 font-serif text-[64px] leading-none sm:text-[76px]">
                You&apos;re <em>fired!</em>
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-[15px] text-charcoal">{fired.sub}</p>

              <dl className="mx-6 mt-6 grid grid-cols-2 border-y border-pale">
                <div className="border-r border-pale py-4">
                  <dt className="eyebrow text-[10px] text-slate">{recount ? "Recounted ratings" : "Ratings"}</dt>
                  <dd className="mt-1 font-serif text-4xl tabular-nums">
                    {(recount ? recount.value : fired.score).toLocaleString("en-US")}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="eyebrow text-[10px] text-slate">Best ever</dt>
                  <dd className="mt-1 font-serif text-4xl tabular-nums">{Math.max(best, fired.score).toLocaleString("en-US")}</dd>
                </div>
              </dl>
              <p className="mt-3 h-5 text-[13px] font-semibold text-red">
                {recount?.done
                  ? "Recount complete. Same result. Sad!"
                  : recount
                    ? "Counting very carefully…"
                    : fired.record
                      ? "New record! The best score in history, maybe ever."
                      : ""}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3 px-6">
                <button type="button" onClick={start} className="btn btn-navy h-12 px-6">
                  Run it back
                </button>
                <button
                  type="button"
                  onClick={demandRecount}
                  disabled={!!recount && !recount.done}
                  className="btn btn-outline-navy h-12 px-6 disabled:opacity-50"
                >
                  Demand a recount
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function TouchButton({
  label,
  wide,
  children,
  ...rest
}: { label: string; wide?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`grid h-16 place-items-center rounded-full border border-white/40 bg-navy/60 text-lg font-semibold uppercase tracking-wider text-white backdrop-blur active:bg-white active:text-navy ${
        wide ? "w-28 text-sm" : "w-16"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function ItemIcon({ kind }: { kind: ItemKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 28 * dpr;
    c.height = 28 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 14 * dpr, 15 * dpr);
    drawItem(ctx, kind, kind === "news" || kind === "windmill" ? 9 : 10, 0.4);
  }, [kind]);
  return <canvas ref={ref} aria-hidden className="size-7" />;
}
