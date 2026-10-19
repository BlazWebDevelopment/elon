import Image from "next/image";

export default function Logo({ large = false, light = false }: { large?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 sm:gap-3">
      <Image
        src="/trump-sticker.png"
        alt=""
        width={large ? 96 : 48}
        height={large ? 94 : 47}
        priority={!large}
        className={`h-auto shrink-0 drop-shadow-[0_3px_6px_rgba(13,19,45,0.25)] ${large ? "w-16 sm:w-20" : "w-9 sm:w-11"}`}
      />
      <span
        className={`whitespace-nowrap font-serif uppercase leading-none ${light ? "text-white" : "text-navy-2"} ${
          large ? "text-[clamp(30px,4vw,48px)] tracking-[0.05em]" : "text-[18px] tracking-[0.05em] sm:text-[22px] sm:tracking-[0.07em]"
        }`}
      >
        Trump <em className={light ? "text-amber" : "text-red"}>Intelligence</em>
      </span>
    </span>
  );
}
