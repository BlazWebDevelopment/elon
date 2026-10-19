import { useId } from "react";

export function Seal({ className = "" }: { className?: string }) {
  const id = useId();
  const stars = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return { x: (100 + Math.cos(a) * 52).toFixed(2), y: (104 + Math.sin(a) * 52).toFixed(2) };
  });
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Seal of the President of Tremendous">
      <defs>
        <path id={`${id}-ring`} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        <radialGradient id={`${id}-field`} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#24357a" />
          <stop offset="1" stopColor="#0d132d" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="#0d132d" />
      <circle cx="100" cy="100" r="94" fill="none" stroke="#c9a227" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="66" fill={`url(#${id}-field)`} stroke="#c9a227" strokeWidth="2" />
      <text fill="#e9d48a" fontSize="11.5" fontWeight="700" fontFamily="var(--font-instrument-sans), sans-serif">
        <textPath href={`#${id}-ring`} startOffset="0" textLength="482" lengthAdjust="spacing">
          ★ TRUMP INTELLIGENCE ★ SEAL OF THE PRESIDENT OF TREMENDOUS
        </textPath>
      </text>
      {stars.map((s, i) => (
        <path
          key={i}
          transform={`translate(${s.x} ${s.y}) scale(0.9)`}
          d="M0,-4 L1.2,-1.2 L4,-1.2 L1.8,0.6 L2.6,3.4 L0,1.8 L-2.6,3.4 L-1.8,0.6 L-4,-1.2 L-1.2,-1.2 Z"
          fill="#ffffff"
        />
      ))}
      <g transform="translate(100 100) scale(0.92)">
        <path d="M-30,2 C-30,-24 30,-24 30,2 Z" fill="#f2b45a" />
        <ellipse cx="-12" cy="-10" rx="2.2" ry="1.3" fill="#fff6dc" />
        <ellipse cx="2" cy="-15" rx="2.2" ry="1.3" fill="#fff6dc" />
        <ellipse cx="14" cy="-9" rx="2.2" ry="1.3" fill="#fff6dc" />
        <ellipse cx="-2" cy="-6" rx="2.2" ry="1.3" fill="#fff6dc" />
        <path d="M-32,2 L-26,7 L-20,2 L-14,7 L-8,2 L-2,7 L4,2 L10,7 L16,2 L22,7 L28,2 L32,4 L32,0 L-32,0 Z" fill="#4fb340" />
        <path d="M-30,5 L30,5 L24,12 L16,8 L8,14 L0,8 L-10,13 L-18,8 L-26,11 Z" fill="#ffcf33" />
        <rect x="-31" y="8" width="62" height="10" rx="5" fill="#5a2f17" />
        <rect x="-29" y="18" width="58" height="9" rx="4" fill="#d98f33" />
      </g>
      <path d="M52,136 Q100,150 148,136 L142,146 L148,156 Q100,170 52,156 L58,146 Z" fill="#f7f3e8" stroke="#c9a227" strokeWidth="1.5" />
      <text
        x="100"
        y="155"
        textAnchor="middle"
        fill="#0d132d"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="0.8"
        fontFamily="var(--font-instrument-sans), sans-serif"
      >
        E PLURIBUS COVFEFE
      </text>
    </svg>
  );
}
