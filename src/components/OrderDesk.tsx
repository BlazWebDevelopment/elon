"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { ACTIONS, RANDOM_ORDERS, SIGNED_QUIPS, pick, type Action } from "@/lib/quotes";
import { Seal } from "./Seal";

const KINDS = ["All", ...Array.from(new Set(ACTIONS.map((a) => a.kind)))];

const SIGNATURE = (() => {
  let seed = 47;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let d = "M6 58 C10 8, 44 6, 30 60 C26 40, 34 24, 40 58";
  let x = 40;
  while (x < 300) {
    const w = 4 + r() * 7;
    const peak = 10 + r() * 36;
    d += ` L${(x + w * 0.5).toFixed(1)} ${peak.toFixed(1)} L${(x + w).toFixed(1)} ${(56 + r() * 10).toFixed(1)}`;
    x += w;
    if (r() < 0.1) {
      d += ` C${x + 6} 70, ${x + 14} 20, ${x + 18} 60`;
      x += 18;
    }
  }
  return `${d} C${x + 12} 74, ${x + 24} 44, ${x + 34} 52`;
})();

type Status = "idle" | "signing" | "signed";

export default function OrderDesk() {
  const [filter, setFilter] = useState("All");
  const [title, setTitle] = useState(ACTIONS[0].title);
  const [text, setText] = useState(ACTIONS[0].order);
  const [status, setStatus] = useState<Status>("idle");
  const [meta, setMeta] = useState({ no: "14147", date: "", quip: SIGNED_QUIPS[0], key: 0 });

  const load = (t: string, o: string) => {
    setTitle(t);
    setText(o);
    setStatus("idle");
  };

  const pickAction = (a: Action) => {
    load(a.title, a.order);
    document.getElementById("sign")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sign = () => {
    if (status === "signing" || !text.trim()) return;
    setMeta((m) => ({
      no: String(14000 + Math.floor(Math.random() * 999)),
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      quip: pick(SIGNED_QUIPS),
      key: m.key + 1,
    }));
    setStatus("signing");
  };

  const shown = filter === "All" ? ACTIONS : ACTIONS.filter((a) => a.kind === filter);

  return (
    <>
      <section id="actions" className="bg-light py-20 text-navy-2 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col gap-6 border-b border-navy/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow text-red">Presidential Actions</p>
              <h2 className="mt-4 font-serif text-[clamp(44px,5.5vw,76px)] leading-[0.95]">
                The latest from the <em>Oval Office</em>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  aria-pressed={filter === k}
                  className={`eyebrow h-9 border px-3.5 text-[10.5px] transition-colors ${
                    filter === k ? "border-navy bg-navy text-white" : "border-navy/20 text-navy-2 hover:border-navy"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <motion.ul layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((a) => (
                <motion.li
                  key={a.title}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    type="button"
                    onClick={() => pickAction(a)}
                    className="group flex h-full w-full flex-col justify-between border-t-[3px] border-transparent bg-white p-7 text-left shadow-[0_1px_0_rgba(13,19,45,0.08)] transition-all hover:-translate-y-1 hover:border-red hover:shadow-[0_18px_40px_-20px_rgba(13,19,45,0.35)]"
                  >
                    <span>
                      <span className="eyebrow block text-[10px] text-red">{a.kind}</span>
                      <span className="mt-4 block font-serif text-[28px] leading-[1.08] text-navy-2">{a.title}</span>
                    </span>
                    <span className="mt-10 flex items-center justify-between border-t border-navy/10 pt-4">
                      <span className="text-[13px] text-slate">{a.date}</span>
                      <span className="eyebrow text-[10.5px] text-navy-2 transition-colors group-hover:text-red">
                        Sign it yourself →
                      </span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>
      </section>

      <section id="sign" className="overflow-hidden bg-stone py-20 text-navy-2 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <div>
            <p className="eyebrow text-red">Executive Order Generator</p>
            <h2 className="mt-4 font-serif text-[clamp(44px,5.5vw,76px)] leading-[0.95]">
              Sign your own <em>executive order</em>
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-charcoal">
              Type your decree. The President signs anything, as long as it&apos;s tremendous. Big Sharpie, big
              signature, big moment.
            </p>

            <label className="mt-8 block">
              <span className="eyebrow text-[10.5px] text-slate">I hereby order that…</span>
              <textarea
                value={text}
                maxLength={180}
                rows={3}
                onChange={(e) => {
                  setText(e.target.value);
                  setTitle("An Order of Tremendous Importance");
                  setStatus("idle");
                }}
                placeholder="All Fridays shall be pizza day."
                className="mt-2 block w-full resize-none border border-navy/25 bg-white px-4 py-3 text-[16px] text-navy-2 outline-none transition placeholder:text-slate focus:border-navy"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={sign}
                disabled={status === "signing" || !text.trim()}
                className="btn btn-navy h-12 px-7 disabled:opacity-50"
              >
                ✍ Sign it
              </button>
              <button
                type="button"
                onClick={() => {
                  const r = pick(RANDOM_ORDERS);
                  load(r.title, r.order);
                }}
                className="btn btn-outline-navy h-12 px-6"
              >
                Random order
              </button>
            </div>
          </div>

          <div className="relative pt-24">
            <AnimatePresence>
              {status === "signed" && (
                <motion.div
                  key={`head-${meta.key}`}
                  initial={{ y: 120, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 120, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className="absolute left-[8%] top-0 z-0 flex items-start gap-3"
                >
                  <Image src="/trump-sticker.png" alt="" width={170} height={166} className="sticker h-auto w-36 -rotate-6 sm:w-40" />
                  <p className="relative mt-4 max-w-[220px] bg-navy px-4 py-3 text-[14px] font-semibold text-white before:absolute before:-left-2 before:top-4 before:border-y-8 before:border-r-8 before:border-y-transparent before:border-r-navy">
                    {meta.quip}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.article
              animate={status === "signed" ? { rotate: -2.5, y: -8, scale: 1.02 } : { rotate: 0, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="relative z-10 overflow-hidden bg-paper px-7 py-10 font-serif text-navy shadow-[0_40px_80px_-30px_rgba(13,19,45,0.5)] sm:px-12"
            >
              <Seal className="pointer-events-none absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]" />
              <div className="relative text-center">
                <Seal className="mx-auto size-16" />
                <p className="eyebrow mt-3 text-[10px] text-slate">Trump Intelligence</p>
                <p className="eyebrow mt-6 text-[11px] tracking-[0.3em] text-navy">Executive Order {meta.no}</p>
                <h3 className="mt-2 text-[clamp(26px,3vw,36px)] leading-tight">{title}</h3>
              </div>
              <div className="relative mt-6 space-y-3 text-[16px] leading-relaxed text-navy-2/90">
                <p>
                  By the authority vested in me by Trump Intelligence and the laws of Tremendousness, it is hereby
                  ordered as follows:
                </p>
                <p>
                  <span className="font-sans text-[12px] font-bold uppercase tracking-wider">Section 1.</span>{" "}
                  {text.trim() || "…"}
                </p>
                <p>
                  <span className="font-sans text-[12px] font-bold uppercase tracking-wider">Sec. 2.</span> This order is
                  tremendous and shall be enforced bigly, effective immediately, or in two weeks.
                </p>
              </div>

              <div className="relative mt-8 flex items-end justify-between gap-4">
                <div className="w-[62%]">
                  <svg viewBox="0 0 340 80" className="h-auto w-full overflow-visible" aria-hidden>
                    {status !== "idle" && (
                      <motion.path
                        key={meta.key}
                        d={SIGNATURE}
                        fill="none"
                        stroke="#0b0b14"
                        strokeWidth="3.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        onAnimationComplete={() => setStatus((s) => (s === "signing" ? "signed" : s))}
                      />
                    )}
                  </svg>
                  <div className="h-px bg-navy/40" />
                  <p className="eyebrow mt-2 text-[9.5px] text-slate">The President of Tremendous</p>
                </div>
                <p className="eyebrow pb-6 text-right text-[9.5px] text-slate">
                  The White House,
                  <br />
                  {status === "idle" ? "________" : meta.date}
                </p>
              </div>

              <AnimatePresence>
                {status === "signed" && (
                  <motion.div
                    key={`stamp-${meta.key}`}
                    initial={{ scale: 2.4, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: -14 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="absolute right-6 top-24 border-[3px] border-red px-3 py-1 font-sans text-[26px] font-extrabold uppercase tracking-[0.12em] text-red mix-blend-multiply sm:right-10"
                  >
                    Signed!
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          </div>
        </div>
      </section>
    </>
  );
}
