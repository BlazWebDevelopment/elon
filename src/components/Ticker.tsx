import { TICKER } from "@/lib/quotes";

export default function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative flex h-11 items-stretch overflow-hidden bg-red text-white" aria-label="Breaking news">
      <span className="eyebrow relative z-10 flex shrink-0 items-center gap-2 bg-deep-red px-4 text-[11px] sm:px-6">
        <span className="size-2 animate-pulse rounded-full bg-white" />
        Breaking
      </span>
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        <ul className="flex w-max animate-marquee items-center whitespace-nowrap">
          {items.map((t, i) => (
            <li key={i} className="flex items-center text-[13px] font-medium" aria-hidden={i >= TICKER.length}>
              <span className="px-6">{t}</span>
              <span aria-hidden className="text-amber">
                ★
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
