"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; r: number; tw: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let W = 0;
    let H = 0;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let nextMeteor = 2 + Math.random() * 4;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((W * H) / 5200);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random(),
        r: 0.3 + Math.random() * 1.3,
        tw: Math.random() * Math.PI * 2,
      }));
    };
    resize();

    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / W - 0.5;
      mouse.ty = e.clientY / H - 0.5;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let last = performance.now();
    let t = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        s.y += dt * (2 + s.z * 6);
        if (s.y > H) s.y -= H;
        const px = s.x - mouse.x * 40 * s.z;
        const py = s.y - mouse.y * 30 * s.z;
        const a = (0.35 + s.z * 0.65) * (0.6 + 0.4 * Math.sin(t * (1 + s.z * 2) + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.z > 0.9 ? "#dfe9ff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(px, py, s.r * (0.6 + s.z * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        nextMeteor = 4 + Math.random() * 7;
        meteors.push({
          x: Math.random() * W * 0.8 + W * 0.2,
          y: Math.random() * H * 0.4,
          vx: -(500 + Math.random() * 400),
          vy: 220 + Math.random() * 160,
          life: 0,
        });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const a = Math.max(0, 1 - m.life / 1.1);
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.18, m.y - m.vy * 0.18);
        g.addColorStop(0, `rgba(255,255,255,${a * 0.9})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.18, m.y - m.vy * 0.18);
        ctx.stroke();
        if (m.life > 1.1) meteors.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(140%_90%_at_50%_0%,#0b0d12_0%,#030405_50%,#000_100%)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
