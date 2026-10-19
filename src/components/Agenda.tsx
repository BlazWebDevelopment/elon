"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { AGENDA } from "@/lib/quotes";

export default function Agenda() {
  const [open, setOpen] = useState(0);

  return (
    <section id="agenda" className="bg-white py-20 text-navy-2 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-red">The Agenda</p>
          <h2 className="mt-4 font-serif text-[clamp(44px,5.5vw,76px)] leading-[0.95]">
            Promises made. <em>Hamberders</em> delivered.
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-charcoal">
            A bold, beautiful plan for America. Written in Sharpie, approved by the President and fact-checked by the
            President. The most transparent agenda in history.
          </p>
          <div className="mt-10 hidden items-end gap-5 lg:flex">
            <Image src="/trump-sticker.png" alt="" width={140} height={137} className="sticker h-auto w-32 animate-bob" />
            <p className="relative mb-12 max-w-[220px] bg-navy px-4 py-3 text-[14px] font-semibold text-white before:absolute before:-left-2 before:bottom-3 before:border-y-8 before:border-r-8 before:border-y-transparent before:border-r-navy">
              Read it. Very good reading. Better than most books.
            </p>
          </div>
        </div>

        <ol className="border-t border-navy/15">
          {AGENDA.map((a, i) => {
            const isOpen = open === i;
            return (
              <li key={a.title} className="border-b border-navy/15">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center gap-5 py-6 text-left sm:gap-8 sm:py-7"
                >
                  <span className="eyebrow w-7 shrink-0 text-[11px] text-slate">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`flex-1 font-serif text-[clamp(28px,3.6vw,48px)] uppercase leading-none tracking-[0.01em] transition-colors ${
                      isOpen ? "text-red" : "group-hover:text-red"
                    }`}
                  >
                    {a.title}
                  </span>
                  <span
                    aria-hidden
                    className={`grid size-10 shrink-0 place-items-center rounded-full border text-xl transition-all duration-300 ${
                      isOpen ? "rotate-45 border-red bg-red text-white" : "border-navy/25 group-hover:border-red"
                    }`}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-6 pb-8 pl-12 sm:grid-cols-[1fr_auto] sm:items-end sm:pl-15">
                        <p className="max-w-xl text-[16px] leading-relaxed text-charcoal">{a.body}</p>
                        <div className="border-l-2 border-amber pl-4">
                          <p className="font-serif text-5xl leading-none">{a.stat}</p>
                          <p className="eyebrow mt-2 text-[10px] text-slate">{a.statLabel}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
