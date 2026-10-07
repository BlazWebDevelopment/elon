"use client";

import { motion, useAnimate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ElonEngine, buildTitleProfile, type EngineStats, type Gravity } from "@/lib/elon-engine";
import { TICKER } from "@/lib/quotes";
import Ticker from "./Ticker";

const GRAVITY_OPTIONS: { id: Gravity; label: string }[] = [
  { id: "earth", label: "Earth" },
  { id: "mars", label: "Mars" },
  { id: "moon", label: "Moon" },
  { id: "zero", label: "Zero-G" },
];

export default function Playground() {
  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ElonEngine | null>(null);
  const grabbedRef = useRef(false);
  const [stats, setStats] = useState<EngineStats>({ count: 0, thrown: 0, longestFlight: 0, rud: 0 });
  const [gravity, setGravity] = useState<Gravity>("earth");

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ground = groundRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ground || !ctx) return;

    const engine = new ElonEngine();
    engineRef.current = engine;
    engine.onStats = setStats;
    engine.font = getComputedStyle(wrap).fontFamily;
    const img = new Image();
    img.src = "/elon-head.png";
    engine.head = img;

    let maskTimer = 0;
    const lettersSettleAt = performance.now() + 2200;
    const buildMask = () => {
      engine.setTitleTop(buildTitleProfile(wrap, engine.W, engine.H));
    };
    const scheduleMask = (delay: number) => {
      window.clearTimeout(maskTimer);
      const wait = Math.max(delay, lettersSettleAt - performance.now());
      maskTimer = window.setTimeout(() => {
        document.fonts.ready.then(buildMask);
      }, wait);
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(r.width, r.height, ground.offsetTop + 2);
    };
    resize();
    engine.populate(engine.W < 640 ? 2 : engine.W < 1100 ? 3 : 4);
    scheduleMask(0);

    const ro = new ResizeObserver(() => {
      resize();
      scheduleMask(250);
    });
    ro.observe(wrap);

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
      window.clearTimeout(maskTimer);
      engineRef.current = null;
    };
  }, []);

  const local = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const engine = engineRef.current;
    if (!engine || !e.isPrimary || e.button !== 0) return;
    const { x, y } = local(e);
    grabbedRef.current = engine.pointerDown(x, y);
    if (grabbedRef.current) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = "grabbing";
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const { x, y } = local(e);
    if (engine.grab) engine.pointerMove(x, y);
    else if (e.pointerType === "mouse") e.currentTarget.style.cursor = engine.hit(x, y) ? "grab" : "";
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const engine = engineRef.current;
    if (!engine?.grab) return;
    engine.pointerUp();
    e.currentTarget.style.cursor = "";
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const kickLetter = (el: HTMLElement) => {
    const wrap = wrapRef.current;
    const engine = engineRef.current;
    if (!wrap || !engine) return;
    const box = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    engine.kick(r.left - box.left, r.right - box.left);
  };

  const changeGravity = (g: Gravity) => {
    setGravity(g);
    engineRef.current?.setGravity(g);
  };

  return (
    <section
      ref={wrapRef}
      className="relative h-svh min-h-[600px] w-full touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (!grabbedRef.current) return;
        grabbedRef.current = false;
        e.stopPropagation();
      }}
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-[clamp(130px,17svh,160px)] pt-24 sm:pb-28">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="label mb-[min(5svh,3rem)] flex items-center gap-3 whitespace-nowrap text-[9px] tracking-[0.16em] text-bone/60 sm:gap-4 sm:text-[11px] sm:tracking-[0.22em]"
        >
          <span className="h-px w-5 bg-bone/40 sm:w-14" />
          Department of Superior Intelligence
          <span className="h-px w-5 bg-bone/40 sm:w-14" />
        </motion.p>

        <h1 className="inline-flex flex-col items-stretch text-center" aria-label="Elon Intelligence">
          <span
            aria-hidden
            className="flex justify-center font-display text-[min(36vw,28svh)] font-bold uppercase leading-[0.8] tracking-[0.02em] text-bone sm:text-[min(22vw,32svh,19rem)]"
          >
            {"ELON".split("").map((ch, i) => (
              <Letter key={i} ch={ch} index={i} onKick={kickLetter} />
            ))}
          </span>
          <span
            aria-hidden
            className="mt-[min(3.2vw,3.4svh)] flex justify-between font-display text-[min(7vw,5.2svh)] font-light uppercase leading-none text-bone/90 sm:text-[min(4.4vw,6.4svh,4rem)]"
          >
            {"INTELLIGENCE".split("").map((ch, i) => (
              <motion.span
                key={i}
                data-mask
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.04, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                {ch}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-[min(5svh,2.75rem)] flex flex-col items-center gap-2 text-center"
        >
          <Ticker lines={TICKER} />
          <p className="max-w-md text-sm font-light text-bone/50 sm:text-[15px]">
            Grab an Elon. Throw him. He&apos;ll be fine. Click a letter to launch whoever is standing on it.
          </p>
        </motion.div>
      </div>

      <div
        ref={groundRef}
        className="absolute inset-x-0 bottom-0 z-0 h-[clamp(130px,17svh,160px)] border-t border-white/30 bg-black sm:h-28"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-full h-[22svh] bg-gradient-to-t from-atmo/[0.13] via-atmo/[0.04] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
        <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_1px,transparent_1px_48px)]" />
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

      <div className="absolute inset-x-0 bottom-0 z-30 flex h-[clamp(130px,17svh,160px)] flex-col items-center justify-center gap-4 px-4 pt-3 sm:h-28 sm:flex-row sm:justify-between sm:px-10 sm:pt-4">
        <dl className="flex gap-6 sm:gap-10">
          <Stat label="Elons" value={stats.count} />
          <Stat label="Thrown" value={stats.thrown} />
          <Stat label="Best flight" value={`${stats.longestFlight.toFixed(2)}s`} />
          <Stat label="RUDs" value={stats.rud} />
        </dl>
        <div className="flex items-center gap-2 sm:gap-3" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex border border-white/25">
            {GRAVITY_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => changeGravity(g.id)}
                className={`relative h-9 whitespace-nowrap px-2.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3.5 sm:text-[11px] ${
                  gravity === g.id ? "text-void" : "text-bone/60 hover:text-bone"
                }`}
              >
                {gravity === g.id && (
                  <motion.span
                    layoutId="gravity-pill"
                    className="absolute inset-0 bg-bone"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">{g.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => engineRef.current?.spawn()}
            className="btn-ghost h-9 whitespace-nowrap px-3 text-[10px] sm:px-4 sm:text-[11px]"
          >
            + Elon
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.chaos()}
            className="btn-solid h-9 px-3 text-[10px] sm:px-5 sm:text-[11px]"
          >
            Chaos
          </button>
        </div>
      </div>
    </section>
  );
}

function Letter({ ch, index, onKick }: { ch: string; index: number; onKick: (el: HTMLElement) => void }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  return (
    <motion.span
      data-mask
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block cursor-pointer"
      onClick={(e) => {
        onKick(e.currentTarget);
        animate(scope.current, { y: [0, -36, 0], scaleY: [1, 1.06, 0.96, 1] }, { duration: 0.5, ease: "easeOut" });
      }}
    >
      <span ref={scope} className="inline-block transition-opacity duration-200 hover:opacity-70">
        {ch}
      </span>
    </motion.span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1 sm:items-start">
      <dt className="label whitespace-nowrap text-[9px] text-bone/50 sm:text-[10px]">{label}</dt>
      <dd className="font-display text-2xl font-semibold leading-none tabular-nums text-bone sm:text-3xl">{value}</dd>
    </div>
  );
}
