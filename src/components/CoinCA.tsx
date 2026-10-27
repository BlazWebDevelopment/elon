"use client";

import Image from "next/image";
import { useState } from "react";

const CA = "YSgMzxTjTGZ1QS7Ueae1aLjv3HfAuJ8Qkuj7tBHFdon";

export default function CoinCA() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <section id="coin" className="relative overflow-hidden bg-navy py-20 text-white sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-8">
        <Image src="/trump-sticker.png" alt="" width={140} height={137} className="sticker h-auto w-24 animate-bob" />
        <p className="eyebrow mt-6 text-amber">Official Coin</p>
        <h2 className="mt-4 font-serif text-[clamp(56px,9vw,128px)] leading-[0.9]">
          <span className="text-amber">$TI</span>
        </h2>
        <p className="mt-3 font-serif text-[clamp(26px,3.4vw,44px)] leading-none">Trump Intelligence</p>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/70">
          We will be higher than <span className="font-semibold text-white">TRUMP Coin</span>. Much higher. Everybody
          is saying it. The most tremendous ticker in history.
        </p>

        <div className="mt-10 w-full max-w-3xl border border-white/20 bg-white/5 p-2 sm:p-3">
          <p className="eyebrow px-2 pb-2 pt-1 text-left text-[10.5px] text-white/50">Contract Address (CA)</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex min-h-12 flex-1 items-center break-all bg-navy-2 px-4 py-3 text-left font-mono text-[14px] text-white sm:text-[15px]">
              {CA}
            </code>
            <button type="button" onClick={copy} className="btn btn-light h-12 shrink-0 px-6">
              {copied ? "Copied!" : "Copy CA"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
