"use client";

import { useEffect, useState } from "react";

export default function Ticker({ lines }: { lines: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const line = lines[index % lines.length];

  useEffect(() => {
    const done = count >= line.length;
    const id = window.setTimeout(
      () => {
        if (done) {
          setCount(0);
          setIndex((i) => i + 1);
        } else setCount((c) => c + 1);
      },
      done ? 2600 : 38 + Math.random() * 40,
    );
    return () => window.clearTimeout(id);
  }, [count, line]);

  return (
    <p
      className="h-6 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-bone sm:text-[15px]"
      aria-live="polite"
    >
      {line.slice(0, count)}
      <span className="ml-1 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-blink bg-bone" />
    </p>
  );
}
