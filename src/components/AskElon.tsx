"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CHATTER, pick } from "@/lib/quotes";

const RULES: [RegExp, string[]][] = [
  [/mars|planet|space|moon/i, ["Mars by 2026. Okay, 2028. Pack a jacket.", "Occupy Mars. The commute is rough though."]],
  [/self.?driving|fsd|autopilot|\bcar\b|tesla/i, ["Next year.", "Full self-driving is basically solved. Next year.", "It drives itself. Mostly. Keep your hands on the wheel."]],
  [/doge|crypto|bitcoin|coin|money|invest|stock|rich/i, ["Much wow. Not financial advice.", "Funding secured.", "To the moon. Not financial advice."]],
  [/simulation|real|matrix/i, ["Odds we're in base reality? One in billions.", "Concerning."]],
  [/\bai\b|robot|optimus|agi/i, ["I'm not a robot. Probably.", "The robots are friendly. Mostly."]],
  [/twitter|\bx\b|tweet|post/i, ["It's called X now.", "Let that sink in."]],
  [/when|how long|timeline|soon|eta/i, ["Two weeks.", "Next year. For sure this time.", "Sooner than you think. Later than I said."]],
  [/love|date|girlfriend|boyfriend|marry/i, ["I'm married to the mission. And several companies."]],
  [/why/i, ["First principles.", "Because the most entertaining outcome is the most likely."]],
  [/should i|can i|will i|is it|am i|do i/i, ["Yes.", "Absolutely not.", "Ask again after the next launch.", "!!"]],
];

const FALLBACK = [
  ...CHATTER.slice(0, 8),
  "That's an extremely hardcore question.",
  "We'll know more in two weeks.",
  "I'll reply to this at 3am.",
];

const THINKING = [
  "Consulting first principles…",
  "Reading the replies…",
  "Checking with the board (me)…",
  "Asking the Mars colony…",
  "Running it through the simulation…",
];

const SUGGESTIONS = [
  "When will self-driving be ready?",
  "Should I buy Doge?",
  "Are we living in a simulation?",
  "When do we land on Mars?",
  "Why are you like this?",
];

type Msg = { id: number; q: string; a: string };

type PuffSpec = { dx: number; dy: number; scale: number; delay: number; duration: number };
type Smoke = { id: number; puffs: PuffSpec[]; wisps: PuffSpec[]; total: number };

const STONED = [
  "Wow.",
  "Concerning.",
  "We're definitely in a simulation.",
  "First principles, man.",
  "Interesting…",
  "Next year. Definitely next year.",
  "I'm not a robot. I'm vibing.",
];

const MOUTH = { x: "44%", y: "77.5%" };

const INHALE_END = 1.7;
const EXHALE_AT = 2.1;
const SETTLE = 4.6;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeSmoke(): Smoke {
  const side = Math.random() < 0.5 ? -1 : 1;
  const puffs = Array.from({ length: 36 }, (_, i) => {
    const t = i / 35;
    const angle = ((-28 + rand(-24, 24)) * Math.PI) / 180;
    const dist = rand(150, 290) * (0.6 + 0.4 * (1 - t));
    return {
      dx: Math.cos(angle) * dist * side,
      dy: Math.sin(angle) * dist - rand(0, 40),
      scale: rand(0.95, 1.7),
      delay: EXHALE_AT + i * 0.04 + rand(0, 0.04),
      duration: rand(2.2, 2.7),
    };
  });
  const wisps = Array.from({ length: 8 }, (_, i) => ({
    dx: rand(-12, 12),
    dy: rand(-80, -50),
    scale: rand(0.8, 1.2),
    delay: 0.7 + i * 0.12,
    duration: rand(1.4, 1.8),
  }));
  const total = Math.max(...puffs.map((p) => p.delay + p.duration));
  return { id: Date.now(), puffs, wisps, total };
}

const JOINT_TIMES = [0, 0.26, 0.5, 0.74, 1];
const JOINT_DURATION = 2.3;

function SmokeBreak({ smoke }: { smoke: Smoke }) {
  const id = useId();
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <motion.div
        className="absolute left-[54%] top-[77.5%] aspect-[140/28] w-[52%] origin-left -translate-y-1/2"
        initial={{ x: "70%", y: "120%", rotate: 18, opacity: 0 }}
        animate={{
          x: ["70%", "0%", "-3%", "-2%", "80%"],
          y: ["120%", "0%", "0%", "0%", "140%"],
          rotate: [18, -10, -12, -12, 20],
          opacity: [0, 1, 1, 1, 0],
        }}
        transition={{
          duration: JOINT_DURATION,
          times: JOINT_TIMES,
          ease: ["easeOut", "easeInOut", "easeInOut", "easeIn"],
        }}
        style={{ willChange: "transform, opacity" }}
      >
        <svg viewBox="0 0 140 28" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#ece7dc" />
              <stop offset="1" stopColor="#c9c1b0" />
            </linearGradient>
            <radialGradient id={`${id}-ember`}>
              <stop offset="0" stopColor="#fff6c2" />
              <stop offset="0.35" stopColor="#ffb347" />
              <stop offset="0.7" stopColor="#ff4d1a" />
              <stop offset="1" stopColor="#8a1600" />
            </radialGradient>
          </defs>
          <path d="M2 11 L128 4 Q136 14 128 24 L2 17 Q0 14 2 11 Z" fill={`url(#${id}-paper)`} />
          <path d="M2 11 L18 10 L18 18 L2 17 Q0 14 2 11 Z" fill="#d6c59d" />
          <path d="M44 8 L48 19 M74 6 L78 21 M104 5 L108 22" stroke="#b5ad9b" strokeWidth="0.9" opacity="0.7" />
          <ellipse cx="129" cy="14" rx="5" ry="10" fill="#5f5f5f" />
          <ellipse cx="132" cy="14" rx="5.5" ry="8.5" fill={`url(#${id}-ember)`} />
        </svg>
        <motion.span
          className="absolute -right-[6%] top-1/2 aspect-square w-[22%] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,170,70,0.95),rgba(255,77,26,0.45)_40%,transparent_70%)] blur-[2px]"
          animate={{ scale: [0.6, 0.7, 1.9, 1.5, 0.6], opacity: [0.5, 0.6, 1, 0.9, 0] }}
          transition={{ duration: JOINT_DURATION, times: JOINT_TIMES, ease: "easeInOut" }}
        />
        {smoke.wisps.map((w, i) => (
          <Puff key={i} puff={w} className="right-[-2%] top-1/2 w-[22%]" soft />
        ))}
      </motion.div>

      {smoke.puffs.map((p, i) => (
        <Puff key={i} puff={p} className="w-[36%]" style={{ left: MOUTH.x, top: MOUTH.y }} />
      ))}
    </div>
  );
}

function Puff({
  puff,
  className = "",
  style,
  soft,
}: {
  puff: PuffSpec;
  className?: string;
  style?: React.CSSProperties;
  soft?: boolean;
}) {
  return (
    <motion.span
      className={`absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(205,205,210,0.85),rgba(170,170,178,0.5)_32%,rgba(150,150,158,0.16)_54%,transparent_70%)] ${className}`}
      style={{ ...style, willChange: "transform, opacity" }}
      initial={{ x: 0, y: 0, scale: 0.12, opacity: 0 }}
      animate={{ x: puff.dx, y: puff.dy, scale: puff.scale, opacity: [0, soft ? 0.7 : 0.95, soft ? 0.45 : 0.65, 0] }}
      transition={{
        duration: puff.duration,
        delay: puff.delay,
        ease: [0.22, 0.61, 0.36, 1],
        opacity: { duration: puff.duration, delay: puff.delay, times: [0, 0.14, 0.5, 1], ease: "easeInOut" },
      }}
    />
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function answer(q: string) {
  for (const [re, answers] of RULES) if (re.test(q)) return pick(answers);
  return pick(FALLBACK);
}

export default function AskElon() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const [smoke, setSmoke] = useState<Smoke | null>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const stageRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      stage.style.setProperty("--rx", `${(-y * 18).toFixed(2)}deg`);
      stage.style.setProperty("--ry", `${(x * 24).toFixed(2)}deg`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q || thinking || smoke) return;
    setInput("");
    setQuip(null);
    setThinking(pick(THINKING));
    const spin = animate(scope.current, { rotate: [0, 360 * 2] }, { duration: 1.3, ease: [0.65, 0, 0.35, 1] });
    await new Promise((r) => setTimeout(r, 1100 + Math.random() * 500));
    await spin;
    setThinking(null);
    setMsgs((m) => [...m.slice(-12), { id: ++idRef.current, q, a: answer(q) }]);
    animate(scope.current, { y: [0, -22, 0], scale: [1, 1.06, 1] }, { duration: 0.45 });
  };

  const poke = async () => {
    if (busyRef.current || thinking) return;
    busyRef.current = true;
    const next = makeSmoke();
    setQuip(null);
    setSmoke(next);
    animate(
      scope.current,
      {
        rotate: [0, -1, -6, -6, 3, 0],
        y: [0, -2, -8, -8, 4, 0],
        scale: [1, 1.005, 1.035, 1.035, 0.99, 1],
      },
      {
        duration: SETTLE,
        times: [0, 0.6 / SETTLE, INHALE_END / SETTLE, EXHALE_AT / SETTLE, 2.9 / SETTLE, 1],
        ease: ["easeOut", "easeInOut", "linear", "easeOut", "easeInOut"],
      },
    );
    await wait(SETTLE * 1000);
    setQuip(pick(STONED));
    await wait((next.total - SETTLE) * 1000 + 150);
    setSmoke(null);
    busyRef.current = false;
  };

  return (
    <section className="mx-auto grid min-h-svh max-w-6xl items-center gap-10 px-4 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div className="relative flex flex-col items-center">
        <div
          ref={stageRef}
          className="relative grid aspect-square w-[min(80vw,440px)] place-items-center [perspective:900px]"
        >
          <div className="absolute inset-[6%] animate-spin-slow rounded-full border border-white/20" />
          <div className="absolute inset-[16%] animate-spin-slower rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-[16%] animate-spin-slower">
            <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-bone shadow-[0_0_14px_#fff]" />
          </div>
          <div className="absolute inset-[6%] animate-spin-slow">
            <span className="absolute left-[14%] top-[14%] size-2 rounded-full bg-bone/70" />
          </div>
          <div className="absolute inset-[22%] animate-pulse-glow rounded-full bg-[radial-gradient(closest-side,rgba(127,178,255,0.16),rgba(255,255,255,0.04)_60%,transparent)] blur-xl" />

          <div
            className="relative w-[58%] transition-transform duration-300 ease-out [transform-style:preserve-3d]"
            style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
          >
            <div className="animate-float">
              <motion.div
                className={smoke || thinking ? "cursor-default" : "cursor-pointer"}
                onClick={poke}
                whileHover={smoke || thinking ? undefined : { scale: 1.03 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                <div ref={scope} className="relative will-change-transform">
                  <Image
                    src="/elon-head.png"
                    alt="Elon Intelligence oracle head"
                    width={270}
                    height={388}
                    priority
                    className="h-auto w-full grayscale drop-shadow-[0_30px_40px_rgba(0,0,0,0.7)]"
                  />
                  {smoke && <SmokeBreak key={smoke.id} smoke={smoke} />}
                </div>
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {quip && (
              <motion.div
                key={quip}
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-[2%] top-[8%] max-w-[55%] bg-bone px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.12em] text-void shadow-xl"
              >
                {quip}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="label mt-2 text-bone/40">
          Neural link: <span className="text-bone">established</span> · IQ: <span className="text-bone">yes</span>
        </p>
        <p
          className={`label mt-3 text-[10px] text-bone/50 transition-opacity duration-500 ${
            !smoke && !thinking ? "opacity-100" : "opacity-0"
          }`}
        >
          Click his face. He&apos;s earned a break.
        </p>
      </div>

      <div className="relative border border-white/15 bg-black/50 p-5 backdrop-blur-md sm:p-9">
        <p className="label text-bone/50">The Oracle</p>
        <h2 className="mt-3 font-display uppercase leading-none">
          <span className="block text-5xl font-bold tracking-[0.06em] sm:text-6xl">Ask Elon</span>
          <span className="mt-3 block text-lg font-light tracking-[0.5em] text-bone/85 sm:text-xl">Intelligence</span>
        </h2>
        <p className="mt-5 font-light text-bone/60">
          Superior answers to inferior questions. Powered by first principles, vibes and a very large rocket.
        </p>

        <div ref={listRef} className="mt-6 flex max-h-[340px] min-h-[160px] flex-col gap-3 overflow-y-auto pr-1">
          {msgs.length === 0 && !thinking && (
            <p className="label m-auto text-center text-bone/30">The oracle is listening…</p>
          )}
          {msgs.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
              <p className="ml-auto max-w-[85%] border border-white/20 px-4 py-2 text-sm text-bone/80">
                {m.q}
              </p>
              <Typed
                text={m.a}
                className="mr-auto max-w-[85%] bg-bone px-4 py-2 font-display font-semibold uppercase tracking-[0.08em] text-void"
              />
            </div>
          ))}
          {thinking && (
            <p className="label mr-auto flex items-center gap-3 border border-white/10 px-4 py-2.5 text-bone/70">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-1.5 rounded-full bg-bone"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </span>
              {thinking}
            </p>
          )}
        </div>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything. He's looking into it."
            maxLength={140}
            className="h-12 min-w-0 flex-1 border border-white/30 bg-black/60 px-4 text-sm text-bone outline-none transition placeholder:text-bone/35 focus:border-bone"
          />
          <button
            type="submit"
            disabled={!input.trim() || !!thinking || !!smoke}
            className="btn-solid h-12 px-6 text-xs disabled:pointer-events-none disabled:opacity-40"
          >
            Ask
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              disabled={!!thinking || !!smoke}
              className="border border-white/15 px-3 py-2 text-xs text-bone/60 transition hover:border-bone hover:text-bone disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Typed({ text, className }: { text: string; className: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) return;
    const id = window.setTimeout(() => setN((v) => v + 1), 28);
    return () => window.clearTimeout(id);
  }, [n, text]);
  return (
    <p className={className}>
      {text.slice(0, n)}
      {n < text.length && <span className="animate-blink">▍</span>}
    </p>
  );
}
