"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import AskElon from "./AskElon";
import LaunchPad from "./LaunchPad";
import Playground from "./Playground";
import Starfield from "./Starfield";

const TABS = [
  { id: "play", label: "Playground" },
  { id: "launch", label: "Launch" },
  { id: "ask", label: "Ask Elon" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

function useTab(): [TabId, (t: TabId) => void] {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab = (TABS.find((t) => t.id === hash)?.id ?? "play") as TabId;
  const setTab = (t: TabId) => {
    if (t === tab) return;
    const url = t === "play" ? window.location.pathname + window.location.search : `#${t}`;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0 });
  };
  return [tab, setTab];
}

export default function SiteShell() {
  const [tab, setTab] = useTab();

  return (
    <div className="relative isolate min-h-svh">
      <Starfield />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-gradient-to-b from-black/70 to-transparent px-4 py-5 sm:px-10 sm:py-6">
        <button
          type="button"
          onClick={() => setTab("play")}
          className="pointer-events-auto flex shrink-0 items-center gap-3"
          aria-label="Elon Intelligence home"
        >
          <Image
            src="/elon-head.png"
            alt=""
            width={27}
            height={39}
            className="h-auto w-6 grayscale contrast-125 sm:w-7"
            priority
          />
          <Wordmark />
        </button>

        <nav className="pointer-events-auto flex gap-5 sm:gap-9" role="tablist" aria-label="Choose an experience">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`relative py-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:text-[13px] ${
                tab === t.id ? "text-bone" : "text-bone/55 hover:text-bone"
              }`}
            >
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="tab-line"
                  className="absolute inset-x-0 -bottom-0.5 h-[2px] bg-bone"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          ))}
        </nav>

        <span className="hidden w-[180px] lg:block" />
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "play" && <Playground />}
          {tab === "launch" && <LaunchPad />}
          {tab === "ask" && <AskElon />}
        </motion.main>
      </AnimatePresence>

      {tab !== "play" && (
        <footer className="label relative flex flex-col items-center gap-2 border-t border-white/10 px-6 py-8 text-center text-bone/35 sm:flex-row sm:justify-between sm:px-10">
          <span>Elon Intelligence © 2026</span>
          <span>No Elons were harmed.</span>
        </footer>
      )}
    </div>
  );
}

function Wordmark() {
  return (
    <span className="relative hidden select-none flex-col items-start leading-none sm:flex">
      <svg
        aria-hidden
        viewBox="0 0 200 16"
        className="pointer-events-none absolute -left-1 -top-4 w-[112%] text-bone"
        fill="none"
      >
        <path d="M4 15 C 70 1, 150 -1, 198 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[15px] font-bold uppercase tracking-[0.32em] text-bone">
        Elon<span className="font-light"> Intelligence</span>
      </span>
    </span>
  );
}
