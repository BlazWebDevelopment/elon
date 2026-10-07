"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { pick } from "@/lib/quotes";

type Phase = "idle" | "countdown" | "flight" | "boom" | "orbit";
type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; hot: boolean };
type Debris = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; w: number; h: number };
type Result = { kind: "orbit" | "rud"; title: string; sub: string };

const EVENTS: [number, string][] = [
  [0, "Liftoff. Elon has cleared the tower… almost."],
  [2.5, "Tower cleared"],
  [5, "Max-Q. Vibes nominal."],
  [8, "MECO"],
  [9, "Stage separation"],
  [11.5, "Orbit insertion"],
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

export default function LaunchPad() {
  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState<number | null>(null);
  const [tele, setTele] = useState({ t: 0, alt: 0, vel: 0 });
  const [log, setLog] = useState<{ t: number; text: string; hot?: boolean }[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [stats, setStats] = useState({ launches: 0, orbits: 0, ruds: 0 });

  const sim = useRef({
    phase: "idle" as Phase,
    t: 0,
    alt: 0,
    vel: 0,
    camY: 0,
    rudAt: Infinity,
    willRud: false,
    nextEvent: 0,
    boost: false,
    shake: 0,
    sep: -1,
    booster: { x: 0, y: 0, vy: 0, rot: 0 },
    head: { x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0 },
    puffs: [] as Puff[],
    debris: [] as Debris[],
    endAt: Infinity,
    count: -1,
    done: false,
    mars: false,
  });

  const launch = () => {
    const s = sim.current;
    if (s.phase !== "idle" && !s.done) return;
    s.done = false;
    s.mars = false;
    s.puffs = [];
    s.phase = "countdown";
    s.t = -3;
    s.alt = 0;
    s.vel = 0;
    s.camY = 0;
    s.sep = -1;
    s.nextEvent = 0;
    s.willRud = Math.random() < 0.42;
    s.rudAt = s.willRud ? (Math.random() < 0.15 ? 0.25 : rand(1.4, 10.5)) : Infinity;
    s.debris = [];
    s.endAt = Infinity;
    s.count = -1;
    setResult(null);
    setLog([]);
    setPhase("countdown");
    setStats((st) => ({ ...st, launches: st.launches + 1 }));
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const head = new Image();
    head.src = "/elon-head.png";
    let W = 0;
    let H = 0;
    const stars = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() }));
    const clouds = Array.from({ length: 9 }, (_, i) => ({ x: Math.random(), y: 420 + i * 330 + rand(-80, 80), w: rand(0.6, 1.2) }));
    const font = getComputedStyle(document.body).getPropertyValue("--font-barlow") || "sans-serif";

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const addLog = (text: string, hot = false) => {
      const t = Math.max(0, sim.current.t);
      setLog((l) => [...l.slice(-5), { t, text, hot }]);
    };

    const explode = (x: number, y: number) => {
      const s = sim.current;
      s.phase = "boom";
      s.shake = 1.4;
      s.endAt = s.t + 2;
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(40, 520);
        s.puffs.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: rand(6, 26),
          life: 0,
          max: rand(0.6, 1.6),
          hot: Math.random() < 0.75,
        });
      }
      s.debris = Array.from({ length: 14 }, () => ({
        x,
        y,
        vx: rand(-420, 420),
        vy: rand(-200, 520),
        rot: rand(0, 6),
        spin: rand(-10, 10),
        w: rand(6, 22),
        h: rand(4, 12),
      }));
      s.head = { x, y, vx: rand(-160, 160), vy: rand(380, 560), rot: 0, spin: rand(-9, 9) };
      setPhase("boom");
      addLog(s.alt < 20 ? "Pad RUD. Concerning." : "Rapid unscheduled disassembly", true);
    };

    let raf = 0;
    let last = performance.now();
    let teleClock = 0;
    let time = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const s = sim.current;
      const k = clamp(H / 900, 0.6, 1.1);
      const padY = H - (W < 768 ? 300 : 240) * k;
      const cx = W / 2;

      if (s.phase === "countdown") {
        s.t += dt;
        const c = Math.ceil(-s.t);
        if (c !== s.count) {
          s.count = c;
          setCount(c > 0 ? c : null);
        }
        if (s.t > -0.8) emitExhaust(s, cx, 0, k, 0.6, true);
        if (s.t >= 0) {
          s.phase = "flight";
          setPhase("flight");
        }
      } else if (s.phase === "flight" || s.phase === "orbit") {
        s.t += dt;
        let acc = 42 + s.t * 24;
        if (s.boost && s.phase === "flight") {
          acc *= 1.9;
          if (Math.random() < dt * 0.14 && s.rudAt === Infinity) s.rudAt = s.t;
        }
        if ((s.t > 8 && s.t < 9) || s.done) acc = 0;
        s.vel += acc * dt;
        s.alt += s.vel * dt;
        s.camY = Math.max(0, s.alt - (padY - H * 0.45));
        if (s.t < 8) emitExhaust(s, cx, s.alt, k, s.alt < 1500 ? 1 : 0.4, s.alt < 200);
        if (s.sep < 0 && s.t >= 9) {
          s.sep = s.t;
          s.booster = { x: cx, y: s.alt, vy: s.vel * 0.6, rot: 0 };
        }
        if (s.sep >= 0) {
          s.booster.vy -= 900 * dt;
          s.booster.y += s.booster.vy * dt;
          s.booster.rot += dt * 0.8;
        }
        while (s.nextEvent < EVENTS.length && s.t >= EVENTS[s.nextEvent][0]) {
          addLog(EVENTS[s.nextEvent][1]);
          s.nextEvent++;
        }
        if (s.phase === "flight" && s.t >= s.rudAt) {
          explode(cx, s.alt + (s.sep >= 0 ? 190 : 130) * k);
        } else if (s.phase === "flight" && s.t > 12) {
          s.phase = "orbit";
          s.mars = true;
          s.endAt = s.t + 1.6;
          setPhase("orbit");
          addLog("Orbit achieved. Mars is that way →");
        }
      } else if (s.phase === "boom") {
        s.t += dt;
        s.head.vy -= 520 * dt;
        s.head.x += s.head.vx * dt;
        s.head.y += s.head.vy * dt;
        s.head.rot += s.head.spin * dt;
        for (const d of s.debris) {
          d.vy -= 700 * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.rot += d.spin * dt;
        }
      }

      if (s.t > s.endAt) {
        const kind = s.phase === "orbit" ? "orbit" : "rud";
        s.endAt = Infinity;
        s.done = true;
        s.boost = false;
        setPhase("idle");
        setStats((st) => ({
          ...st,
          orbits: st.orbits + (kind === "orbit" ? 1 : 0),
          ruds: st.ruds + (kind === "rud" ? 1 : 0),
        }));
        setResult(
          kind === "orbit"
            ? {
                kind,
                title: "Orbit achieved",
                sub: pick([
                  "Next stop: Mars. ETA two weeks (Elon time).",
                  "Flawless. Now do it again, but bigger.",
                  "The booster would like to be caught. Ask nicely.",
                ]),
              }
            : {
                kind,
                title: "Rapid Unscheduled Disassembly",
                sub: pick([
                  "Excellent data though.",
                  "That's why we test.",
                  "Success was one possible outcome. So was this.",
                  "Elon is fine. Probably.",
                ]),
              },
        );
      }

      for (const p of s.puffs) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.r += dt * (p.hot ? 14 : 22);
      }
      s.puffs = s.puffs.filter((p) => p.life < p.max);
      s.shake = Math.max(0, s.shake - dt * 1.6);

      teleClock += dt;
      if (teleClock > 0.1) {
        teleClock = 0;
        setTele({ t: s.t, alt: s.alt / 38, vel: s.vel * 9 });
      }

      // ---------- draw ----------
      const f = clamp(s.camY / 2600, 0, 1);
      ctx.save();
      if (s.shake > 0) ctx.translate(rand(-1, 1) * s.shake * 9, rand(-1, 1) * s.shake * 9);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, mix("#050a18", "#000000", f));
      sky.addColorStop(0.65, mix("#142440", "#000000", f));
      sky.addColorStop(1, mix("#4d607e", "#030405", f));
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      for (const st of stars) {
        const y = (((st.y * H + s.camY * 0.12 * (0.3 + st.z)) % H) + H) % H;
        ctx.globalAlpha = (0.15 + f * 0.85) * (0.3 + st.z * 0.7) * (0.75 + 0.25 * Math.sin(time * 2 + st.x * 40));
        ctx.fillStyle = "#fff";
        const streak = Math.min(18, s.vel * 0.004 * st.z);
        ctx.fillRect(st.x * W, y - streak, 0.8 + st.z, 0.8 + st.z + streak);
      }
      ctx.globalAlpha = 1;

      if (s.mars) {
        const pr = clamp((s.t - 11.8) / 2.5, 0, 1);
        const R = Math.min(W, H) * 0.32;
        const mx = W * 0.82;
        const my = H * 0.25 + (1 - pr) * H * 0.4;
        const glow = ctx.createRadialGradient(mx, my, R * 0.9, mx, my, R * 1.5);
        glow.addColorStop(0, "rgba(214,140,100,0.22)");
        glow.addColorStop(1, "rgba(214,140,100,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mx, my, R * 1.5, 0, Math.PI * 2);
        ctx.fill();
        const body = ctx.createRadialGradient(mx - R * 0.4, my - R * 0.4, R * 0.1, mx, my, R);
        body.addColorStop(0, "#e2b49a");
        body.addColorStop(0.5, "#a4553a");
        body.addColorStop(1, "#1e0d08");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(mx, my, R, 0, Math.PI * 2);
        ctx.fill();
      }

      const toScreen = (wy: number) => padY - (wy - s.camY);

      for (const c of clouds) {
        const y = toScreen(c.y);
        if (y < -120 || y > H + 120) continue;
        ctx.globalAlpha = 0.1 * (1 - f);
        ctx.fillStyle = "#e8eef8";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(c.x * W + (i - 2) * 70 * c.w, y + Math.sin(i * 2) * 10, 90 * c.w, 28, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      const gy = toScreen(0);
      if (gy < H + 10) {
        ctx.fillStyle = "#030303";
        ctx.fillRect(-20, gy, W + 40, H - gy + 40);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(-20, gy, W + 40, 1);
        ctx.fillStyle = "#26272b";
        ctx.fillRect(cx - 110 * k, gy - 10 * k, 220 * k, 10 * k);
        drawTower(ctx, cx - 78 * k, gy - 10 * k, k);
      }

      for (const p of s.puffs) {
        const a = 1 - p.life / p.max;
        if (p.hot) {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(255,${Math.round(120 + a * 120)},${Math.round(40 + a * 60)},${a * 0.5})`;
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = `rgba(${Math.round(170 - f * 90)},${Math.round(150 - f * 80)},${Math.round(160 - f * 80)},${a * 0.28})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, toScreen(p.y), p.r * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      const thrusting = (s.phase === "flight" && (s.t < 8 || s.t > 9.3)) || s.phase === "orbit" || (s.phase === "countdown" && s.t > -0.6);
      const power = s.phase === "countdown" ? 0.45 : s.boost ? 1.6 : 1;
      const wobble = s.phase === "flight" ? Math.sin(time * 9) * 0.008 : 0;

      if (s.phase !== "boom") {
        const ry = toScreen(s.alt);
        ctx.save();
        ctx.translate(cx, ry);
        ctx.rotate(wobble);
        if (s.sep < 0) {
          if (thrusting) drawFlame(ctx, 0, 0, k, power, time);
          drawBooster(ctx, k, font);
          ctx.translate(0, -130 * k);
          drawShip(ctx, k, head, false);
        } else {
          ctx.translate(0, -130 * k);
          if (thrusting) drawFlame(ctx, 0, 6 * k, k * 0.6, power, time);
          drawShip(ctx, k, head, true);
        }
        ctx.restore();
        if (s.sep >= 0) {
          ctx.save();
          ctx.translate(cx, toScreen(s.booster.y));
          ctx.rotate(s.booster.rot);
          drawBooster(ctx, k, font);
          ctx.restore();
        }
      } else {
        for (const d of s.debris) {
          ctx.save();
          ctx.translate(d.x, toScreen(d.y));
          ctx.rotate(d.rot);
          ctx.fillStyle = "#d9d4cc";
          ctx.fillRect(-d.w / 2, -d.h / 2, d.w * k, d.h * k);
          ctx.restore();
        }
        if (head.complete && head.naturalWidth) {
          const hh = 70 * k;
          ctx.save();
          ctx.translate(s.head.x, toScreen(s.head.y));
          ctx.rotate(s.head.rot);
          ctx.drawImage(head, (-hh * 0.696) / 2, -hh / 2, hh * 0.696, hh);
          ctx.restore();
        }
      }
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const flying = phase === "countdown" || phase === "flight";
  const status =
    phase === "idle"
      ? result
        ? "Awaiting next attempt"
        : "Go for launch"
      : phase === "countdown"
        ? "Terminal count"
        : (log[log.length - 1]?.text ?? "Ascent");
  const progress = clamp((tele.t + 3) / 16, 0, 1);
  const showProgress = phase !== "idle" || !!result;

  return (
    <section
      ref={wrapRef}
      className="relative h-svh min-h-[620px] w-full select-none overflow-hidden"
      onPointerDown={(e) => {
        if (sim.current.phase === "flight" && e.button === 0) sim.current.boost = true;
      }}
      onPointerUp={() => (sim.current.boost = false)}
      onPointerLeave={() => (sim.current.boost = false)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none absolute left-4 top-24 sm:left-10 sm:top-28">
        <p className="label text-bone/50">Mission</p>
        <p className="mt-1 font-display text-3xl font-bold uppercase tracking-[0.12em] text-bone sm:text-4xl">
          Elon-{stats.launches || 1}
        </p>
        <p className={`label mt-2 ${log[log.length - 1]?.hot ? "text-bone" : "text-bone/70"}`}>
          <span
            className={`mr-2 inline-block size-1.5 rounded-full align-middle ${
              phase === "boom" ? "bg-[#ff3b30]" : "animate-pulse-glow bg-bone"
            }`}
          />
          {status}
        </p>
      </div>

      <dl className="pointer-events-none absolute right-4 top-24 hidden gap-8 text-right sm:right-10 sm:top-28 md:flex">
        <BigStat label="Launches" value={stats.launches} />
        <BigStat label="Orbits" value={stats.orbits} />
        <BigStat label="RUDs" value={stats.ruds} />
      </dl>

      <AnimatePresence>
        {count !== null && phase === "countdown" && (
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 grid place-items-center font-display text-[min(38vw,20rem)] font-extralight leading-none text-bone"
          >
            {count}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[320px] flex flex-col items-center gap-3 px-4 md:bottom-[260px]">
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="max-w-lg border border-white/25 bg-black/60 px-8 py-6 text-center backdrop-blur-md"
            >
              <p className="label text-bone/50">{result.kind === "orbit" ? "Mission success" : "Anomaly"}</p>
              <p className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.12em] text-bone sm:text-3xl">
                {result.title}
              </p>
              <p className="mt-2 text-sm font-light text-bone/70 sm:text-base">{result.sub}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {phase === "flight" && (
          <p className="label text-bone/60">Hold anywhere for more thrust · not FAA approved</p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-5 pt-16 sm:px-10 sm:pb-6">
        <div className="flex flex-col items-center gap-4 md:grid md:grid-cols-[1fr_minmax(0,560px)_1fr] md:items-end md:gap-8">
          <div className="flex w-full items-end justify-between gap-4 md:justify-start">
            <div className="flex gap-3 sm:gap-5">
              <Gauge label="Speed" unit="km/h" value={Math.round(tele.vel).toLocaleString("en-US")} frac={tele.vel / 30000} />
              <Gauge label="Altitude" unit="km" value={tele.alt.toFixed(1)} frac={tele.alt / 320} />
            </div>
            <Clock t={tele.t} className="md:hidden" />
          </div>

          <div className="flex w-full flex-col items-center gap-4">
            <Clock t={tele.t} className="hidden md:block" />
            {!flying && phase !== "boom" && phase !== "orbit" ? (
              <button type="button" onClick={launch} className="btn-ghost h-12 px-10 text-sm">
                {result ? "Launch again" : "Launch Elon"}
              </button>
            ) : (
              <div className="h-12" />
            )}
            <div className="relative mt-2 hidden h-12 w-full md:block">
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
              <div
                className="absolute left-0 top-1/2 h-px bg-bone transition-[width] duration-100"
                style={{ width: `${(showProgress ? progress : 0) * 100}%` }}
              />
              {TIMELINE.map((ev, i) => {
                const pos = (ev.t + 3) / 16;
                const passed = showProgress && progress >= pos;
                return (
                  <div key={ev.label} className="absolute top-1/2" style={{ left: `${pos * 100}%` }}>
                    <span
                      className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors ${
                        passed ? "border-bone bg-bone" : "border-white/40 bg-black"
                      }`}
                    />
                    <span
                      className={`label absolute -translate-x-1/2 whitespace-nowrap text-[9px] ${
                        i % 2 ? "bottom-2.5" : "top-2.5"
                      } ${passed ? "text-bone" : "text-bone/40"}`}
                    >
                      {ev.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden justify-end md:flex">
            <div className="text-right">
              <p className="label text-bone/50">Vehicle</p>
              <p className="mt-1 font-display text-lg font-semibold uppercase tracking-[0.16em] text-bone">Falcon Elon</p>
              <p className="label mt-1 text-bone/50">Stage {tele.t >= 9 && phase !== "boom" ? 2 : 1}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TIMELINE = [
  { t: -3, label: "Startup" },
  { t: 0, label: "Liftoff" },
  { t: 5, label: "Max-Q" },
  { t: 8, label: "MECO" },
  { t: 9, label: "Stage sep" },
  { t: 12, label: "Orbit" },
];

function Clock({ t, className = "" }: { t: number; className?: string }) {
  const secs = t < 0 ? Math.ceil(-t) : Math.floor(t);
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <p className={`font-display text-2xl font-semibold tabular-nums tracking-[0.12em] text-bone sm:text-3xl ${className}`}>
      {t < 0 ? "T-" : "T+"} {hh}:{mm}:{ss}
    </p>
  );
}

function Gauge({ label, unit, value, frac }: { label: string; unit: string; value: string; frac: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  const f = clamp(frac, 0, 1);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative size-[76px] sm:size-[84px]">
        <svg viewBox="0 0 80 80" className="absolute inset-0 rotate-[135deg]">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray={`${arc} ${c}`} />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeDasharray={`${arc * f} ${c}`}
            className="transition-[stroke-dasharray] duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[15px] font-semibold tabular-nums leading-none text-bone sm:text-base">{value}</span>
          <span className="label mt-1 text-[8px] text-bone/50">{unit}</span>
        </div>
      </div>
      <span className="label text-[9px] text-bone/60">{label}</span>
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse items-end gap-1">
      <dt className="label text-[10px] text-bone/50">{label}</dt>
      <dd className="font-display text-4xl font-semibold leading-none tabular-nums text-bone">{value}</dd>
    </div>
  );
}

function emitExhaust(
  s: { puffs: Puff[] },
  x: number,
  alt: number,
  k: number,
  amount: number,
  ground: boolean,
) {
  const n = Math.round(3 * amount);
  for (let i = 0; i < n; i++) {
    s.puffs.push({
      x: x + rand(-8, 8) * k,
      y: alt - rand(10, 40) * k,
      vx: ground ? rand(-260, 260) : rand(-30, 30),
      vy: ground ? rand(-20, 40) : rand(-160, -60),
      r: rand(10, 20),
      life: 0,
      max: ground ? rand(1.4, 2.6) : rand(0.8, 1.6),
      hot: false,
    });
  }
  if (s.puffs.length > 900) s.puffs.splice(0, s.puffs.length - 900);
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, power: number, t: number) {
  const len = (90 + Math.sin(t * 50) * 10 + Math.random() * 25) * k * power;
  const w = 20 * k;
  const glow = ctx.createRadialGradient(x, y + len * 0.3, 0, x, y + len * 0.3, len * 0.9);
  glow.addColorStop(0, "rgba(255,170,80,0.5)");
  glow.addColorStop(1, "rgba(255,91,46,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + len * 0.3, len * 0.9, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y, x, y + len);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.2, "#ffe7a0");
  g.addColorStop(0.55, "#ff8a3d");
  g.addColorStop(1, "rgba(255,46,122,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, y);
  ctx.quadraticCurveTo(x - w, y + len * 0.4, x, y + len);
  ctx.quadraticCurveTo(x + w, y + len * 0.4, x + w * 0.6, y);
  ctx.closePath();
  ctx.fill();
}

function drawBooster(ctx: CanvasRenderingContext2D, k: number, font: string) {
  const w = 23 * k;
  ctx.fillStyle = "#4a4a52";
  ctx.beginPath();
  ctx.moveTo(-12 * k, 0);
  ctx.lineTo(12 * k, 0);
  ctx.lineTo(8 * k, -14 * k);
  ctx.lineTo(-8 * k, -14 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#16171a";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * w, -16 * k);
    ctx.lineTo(side * (w + 9 * k), -2 * k);
    ctx.lineTo(side * (w + 6 * k), -2 * k);
    ctx.lineTo(side * (w - 1 * k), -60 * k);
    ctx.closePath();
    ctx.fill();
  }
  const body = ctx.createLinearGradient(-w, 0, w, 0);
  body.addColorStop(0, "#9a9ca0");
  body.addColorStop(0.45, "#ffffff");
  body.addColorStop(1, "#8c8e92");
  ctx.fillStyle = body;
  ctx.fillRect(-w, -132 * k, w * 2, 118 * k);
  ctx.fillStyle = "#121316";
  ctx.fillRect(-w, -132 * k, w * 2, 16 * k);
  ctx.fillStyle = "rgba(20,20,22,0.55)";
  ctx.fillRect(-w, -22 * k, w * 2, 8 * k);
  ctx.fillStyle = "#3a3b40";
  for (const side of [-1, 1]) ctx.fillRect(side > 0 ? w : -w - 7 * k, -128 * k, 7 * k, 8 * k);
  ctx.fillStyle = "#121316";
  ctx.font = `700 ${Math.round(13 * k)}px ${font}, "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  "ELON".split("").forEach((c, i) => ctx.fillText(c, 0, (-100 + i * 15) * k));
  ctx.textAlign = "start";
}

function drawShip(ctx: CanvasRenderingContext2D, k: number, head: HTMLImageElement, alone: boolean) {
  const w = 23 * k;
  if (alone) {
    ctx.fillStyle = "#4a4a52";
    ctx.fillRect(-9 * k, 0, 18 * k, 8 * k);
  }
  const body = ctx.createLinearGradient(-w, 0, w, 0);
  body.addColorStop(0, "#a4a6aa");
  body.addColorStop(0.45, "#ffffff");
  body.addColorStop(1, "#95979b");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-w, 2 * k);
  ctx.lineTo(-w, -70 * k);
  ctx.quadraticCurveTo(-w, -110 * k, 0, -128 * k);
  ctx.quadraticCurveTo(w, -110 * k, w, -70 * k);
  ctx.lineTo(w, 2 * k);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(-w, 0, w * 2, 2 * k);

  const wy = -52 * k;
  const r = 16 * k;
  ctx.fillStyle = "#14141a";
  ctx.beginPath();
  ctx.arc(0, wy, r + 3.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, wy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#0b1a2e";
  ctx.fillRect(-r, wy - r, r * 2, r * 2);
  if (head.complete && head.naturalWidth) {
    const hh = r * 2.5;
    ctx.drawImage(head, -hh * 0.348, wy - hh * 0.42, hh * 0.696, hh);
  }
  const shine = ctx.createLinearGradient(-r, wy - r, r, wy + r);
  shine.addColorStop(0, "rgba(255,255,255,0.35)");
  shine.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(-r, wy - r, r * 2, r * 2);
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, base: number, k: number) {
  const h = 290 * k;
  const w = 22 * k;
  ctx.strokeStyle = "#3a3c42";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w, base - h, w, h);
  ctx.beginPath();
  for (let y = base; y > base - h; y -= 22 * k) {
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y - 22 * k);
    ctx.moveTo(x, y);
    ctx.lineTo(x - w, y - 22 * k);
  }
  ctx.moveTo(x, base - h * 0.78);
  ctx.lineTo(x + 34 * k, base - h * 0.78);
  ctx.moveTo(x, base - h * 0.5);
  ctx.lineTo(x + 34 * k, base - h * 0.5);
  ctx.stroke();
  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(x - w / 2, base - h - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}
