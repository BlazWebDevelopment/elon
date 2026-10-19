"use client";

import Image from "next/image";
import { useState } from "react";
import Logo from "./Logo";
import { Seal } from "./Seal";

const COLUMNS = [
  {
    heading: "About",
    links: [
      ["The President", "#briefing"],
      ["The Agenda", "#agenda"],
      ["The Hamberder Archive", "#agenda"],
      ["Golden Escalator Tours", "#agenda"],
    ],
  },
  {
    heading: "Media",
    links: [
      ["Briefing Room", "#briefing"],
      ["Presidential Actions", "#actions"],
      ["Executive Orders", "#sign"],
      ["Breaking News", "#play"],
    ],
  },
  {
    heading: "Initiatives",
    links: [
      ["Make the Lawn Great Again", "#play"],
      ["Secure the Burgers", "#agenda"],
      ["Defeat the Windmills", "#agenda"],
      ["National Covfefe Day", "#actions"],
    ],
  },
] as const;

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <a href="#play" className="inline-block" aria-label="Trump Intelligence, back to top">
              <Logo large light />
            </a>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/60">
              1600 Pennsylvania Lawn NW, Washington, DC. The most beautiful address in the world. Many people say so.
            </p>

            <div className="mt-10 border-t border-white/15 pt-8">
              <h3 className="font-serif text-[28px] leading-none">Subscribe to Trump Intelligence</h3>
              {joined ? (
                <p className="mt-4 flex items-center gap-3 text-[15px] text-amber">
                  <Image src="/trump-sticker.png" alt="" width={44} height={43} className="h-auto w-10" />
                  You&apos;re on the list. The best list. Some say the greatest list ever made.
                </p>
              ) : (
                <form
                  className="mt-4 flex max-w-md gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim()) setJoined(true);
                  }}
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-12 min-w-0 flex-1 border border-white/30 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-amber"
                  />
                  <button type="submit" className="btn btn-light h-12 px-6">
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((c) => (
              <nav key={c.heading} aria-label={c.heading}>
                <h2 className="eyebrow text-[11px] text-amber">{c.heading}</h2>
                <ul className="mt-5 space-y-3">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[15px] text-white/75 transition-colors hover:text-white hover:underline">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div className="col-span-2 flex items-center gap-4 sm:col-span-3">
              <Seal className="size-24 shrink-0" />
              <p className="text-[13px] leading-relaxed text-white/50">
                Seal of the President of Tremendous. Not to be confused with any real seal. This one has a cheeseburger.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/15 pt-6 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Trump Intelligence. Made for fun, not affiliated with any government. No hamberders were harmed.</p>
          <a href="#play" className="eyebrow shrink-0 text-[10.5px] text-white/70 hover:text-white">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
