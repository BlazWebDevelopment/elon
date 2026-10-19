"use client";

import { motion, useAnimate } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PRESS_FALLBACK, PRESS_RULES, PRESS_SUGGESTIONS, PRESS_THINKING, pick } from "@/lib/quotes";
import { Seal } from "./Seal";

type Msg = { id: number; q: string; a: string };

function answer(q: string) {
  for (const [re, answers] of PRESS_RULES) if (re.test(q)) return pick(answers);
  return pick(PRESS_FALLBACK);
}

export default function PressBriefing() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const listRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  const ask = async (raw: string) => {
    const q = raw.trim();
    if (!q || thinking) return;
    setInput("");
    setThinking(pick(PRESS_THINKING));
    animate(scope.current, { rotate: [0, -8, 8, -5, 0] }, { duration: 1.2 });
    await new Promise((r) => setTimeout(r, 1100 + Math.random() * 600));
    setThinking(null);
    const a = answer(q);
    setMsgs((m) => [...m.slice(-10), { id: ++idRef.current, q, a }]);
    setTalking(true);
    animate(scope.current, { y: [0, -16, 0], scale: [1, 1.05, 1] }, { duration: 0.4 });
  };

  return (
    <section
      id="briefing"
      className="relative overflow-hidden py-20 text-white sm:py-28"
      style={{
        background:
          "repeating-linear-gradient(90deg, #14307a 0px, #1d43a3 26px, #2a55c0 44px, #1d43a3 62px, #14307a 88px), #1d43a3",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,255,255,0.14),transparent_55%),linear-gradient(to_bottom,rgba(13,19,45,0.15),rgba(13,19,45,0.65))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-[repeating-linear-gradient(90deg,#c9a227_0_6px,#a8841a_6px_9px)] opacity-90" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="relative mx-auto flex w-full max-w-[460px] flex-col items-center">
          <FlagPole className="absolute -left-2 bottom-24 hidden h-[78%] sm:block" />
          <FlagPole className="absolute -right-2 bottom-24 hidden h-[78%] -scale-x-100 sm:block" />

          <div className="pointer-events-none absolute bottom-[200px] left-1/2 z-0 h-[150px] w-[78%] -translate-x-1/2 overflow-hidden rounded-t-[48%] bg-[linear-gradient(90deg,#0f1630,#1e2a52_45%,#0f1630)]">
            <div className="absolute left-1/2 top-0 h-[70%] w-[22%] -translate-x-1/2 bg-white [clip-path:polygon(0_0,100%_0,50%_100%)]" />
            <div className="absolute left-1/2 top-[6%] h-[110%] w-[7%] -translate-x-1/2 bg-[#c8102e] [clip-path:polygon(20%_0,80%_0,100%_85%,50%_100%,0_85%)]" />
          </div>
          <div ref={scope} className="relative z-0 -mb-16 w-[62%] origin-bottom">
            <motion.div
              animate={talking ? { rotate: [0, -3, 3, -2, 2, 0], y: [0, -3, 0, -2, 0] } : { rotate: 0, y: 0 }}
              transition={talking ? { duration: 0.9, repeat: Infinity } : { duration: 0.3 }}
            >
              <Image
                src="/trump-head.png"
                alt="The President, ready for questions"
                width={388}
                height={378}
                className="h-auto w-full drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]"
              />
            </motion.div>
          </div>

          <div className="relative z-10 w-full">
            <div className="mx-auto h-4 w-[96%] rounded-t-sm bg-gradient-to-b from-[#3b2a1a] to-[#22180f]" />
            <div className="relative mx-auto flex h-[230px] w-[86%] flex-col items-center bg-[linear-gradient(90deg,#4a3420,#6b4c2e_30%,#7a5634_50%,#6b4c2e_70%,#4a3420)] pt-6 shadow-[0_30px_60px_rgba(0,0,0,0.45)] [clip-path:polygon(0_0,100%_0,92%_100%,8%_100%)]">
              <Seal className="size-28 drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]" />
              <p className="mt-3 font-serif text-[15px] uppercase tracking-[0.25em] text-[#f0dfa6]">Trump Intelligence</p>
            </div>
            <div className="absolute -top-10 left-1/2 h-12 w-1 -translate-x-1/2 bg-[#222]">
              <span className="absolute -top-3 left-1/2 h-5 w-3 -translate-x-1/2 rounded-full bg-[#111]" />
            </div>
          </div>
        </div>

        <div className="border border-white/20 bg-navy/80 p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-9">
          <p className="eyebrow text-amber">The Briefing Room</p>
          <h2 className="mt-3 font-serif text-[clamp(44px,5vw,68px)] leading-[0.95]">
            Ask the <em>President</em>
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/70">
            You have the floor. Ask anything. The answers are perfect, every single one. Perfect answers.
          </p>

          <div
            ref={listRef}
            className="mt-6 flex max-h-[320px] min-h-[150px] flex-col gap-3 overflow-y-auto pr-1"
            aria-live="polite"
          >
            {msgs.length === 0 && !thinking && (
              <p className="eyebrow m-auto text-center text-[10.5px] text-white/35">The President will take your question now</p>
            )}
            {msgs.map((m, i) => (
              <div key={m.id} className="flex flex-col gap-2">
                <p className="ml-auto max-w-[85%] border border-white/20 px-4 py-2.5 text-[14px] text-white/80">
                  <span className="eyebrow mb-1 block text-[9px] text-white/40">You, reporter</span>
                  {m.q}
                </p>
                <Typed
                  text={m.a}
                  onDone={i === msgs.length - 1 ? () => setTalking(false) : undefined}
                  className="mr-auto max-w-[85%] bg-white px-4 py-2.5 text-[15px] font-semibold text-navy"
                />
              </div>
            ))}
            {thinking && (
              <p className="mr-auto flex items-center gap-3 border border-white/15 px-4 py-2.5 text-[13px] text-white/70">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-amber"
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
              placeholder="Mr. President, Mr. President!"
              maxLength={140}
              className="h-12 min-w-0 flex-1 border border-white/30 bg-navy px-4 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-amber"
            />
            <button type="submit" disabled={!input.trim() || !!thinking} className="btn btn-light h-12 px-6 disabled:opacity-40">
              Ask
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESS_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={!!thinking}
                className="border border-white/20 px-3 py-2 text-[13px] text-white/70 transition hover:border-amber hover:text-white disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Typed({ text, className, onDone }: { text: string; className: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= text.length) {
      onDone?.();
      return;
    }
    const id = window.setTimeout(() => setN((v) => v + 1), 24);
    return () => window.clearTimeout(id);
  }, [n, text, onDone]);
  return (
    <p className={className}>
      <span className="eyebrow mb-1 block text-[9px] text-red">The President</span>
      {text.slice(0, n)}
      {n < text.length && <span className="animate-blink">▍</span>}
    </p>
  );
}

function FlagPole({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 300" className={className} aria-hidden>
      <rect x="4" y="6" width="3" height="294" fill="#c9a227" />
      <circle cx="5.5" cy="6" r="5" fill="#e9d48a" />
      <g className="origin-left animate-wave">
        {Array.from({ length: 13 }, (_, i) => (
          <path
            key={i}
            d={`M7 ${14 + i * 9} Q 30 ${10 + i * 9}, 56 ${18 + i * 9} L 56 ${27 + i * 9} Q 30 ${19 + i * 9}, 7 ${23 + i * 9} Z`}
            fill={i % 2 ? "#ffffff" : "#b22234"}
          />
        ))}
        <path d="M7 14 Q 20 12, 30 13 L 30 76 Q 20 75, 7 77 Z" fill="#3c3b6e" />
      </g>
    </svg>
  );
}
