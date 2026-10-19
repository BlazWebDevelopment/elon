"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export const NAV = [
  { href: "#play", label: "Play" },
  { href: "#agenda", label: "Agenda" },
  { href: "#actions", label: "Presidential Actions" },
  { href: "#sign", label: "Sign an Order" },
  { href: "#briefing", label: "Briefing Room" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate/40 bg-white/95 text-navy-2 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-6 sm:px-8">
          <a href="#play" className="shrink-0" aria-label="Trump Intelligence, home">
            <Logo />
          </a>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="eyebrow relative py-2 text-[11.5px] text-navy-2 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-red after:transition-transform hover:text-red hover:after:scale-x-100"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <a href="#play" className="btn btn-navy hidden h-10 px-5 text-[11px] sm:inline-flex">
              Play now
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="eyebrow flex h-10 items-center gap-2 border border-navy/20 px-3 text-[11px] lg:hidden"
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-[4px]">
                <span className="h-[1.5px] w-4 bg-navy" />
                <span className="h-[1.5px] w-4 bg-navy" />
                <span className="h-[1.5px] w-4 bg-navy" />
              </span>
              Menu
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-light text-navy-2"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate/30 px-4 sm:px-8">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="eyebrow h-10 border border-navy/20 px-3 text-[11px]"
              >
                Close ✕
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-2 px-6 sm:px-12">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05 }}
                  className="border-b border-slate/25 py-3 font-serif text-[clamp(36px,9vw,64px)] leading-none transition-colors hover:text-red"
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
