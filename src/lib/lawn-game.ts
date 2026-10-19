import { CATCH, CHATTER, COMBO, HIT, pick } from "./quotes";

export type Phase = "attract" | "play" | "over";
export type ItemKind = "burger" | "coke" | "covfefe" | "sharpie" | "news" | "windmill";
export type Hud = { phase: Phase; score: number; lives: number; combo: number; mult: number; big: number };

type Item = { kind: ItemKind; x: number; y: number; vx: number; vy: number; rot: number; spin: number; r: number };
type Pop = { x: number; y: number; text: string; t: number; dur: number; color: string; size: number; serif: boolean };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  spin: number;
  kind: "confetti" | "dust";
};

const POINTS: Partial<Record<ItemKind, number>> = { burger: 10, coke: 25, covfefe: 50 };
const HAZARD = (k: ItemKind) => k === "news" || k === "windmill";
const BIG_TIME = 7;
const MAX_LIVES = 3;
const CONFETTI = ["#ffbd00", "#b50000", "#ffffff", "#2b4bb3"];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutBack = (k: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};

export class LawnGame {
  W = 0;
  H = 0;
  s = 1;
  horizonY = 0;
  groundY = 0;
  head: HTMLImageElement | null = null;
  font = "sans-serif";
  serif = "serif";
  phase: Phase = "attract";
  paused = false;
  onHud?: (h: Hud) => void;

  score = 0;
  lives = MAX_LIVES;
  combo = 0;
  bigT = 0;
  time = 0;
  playTime = 0;
  spawnT = 1;
  shake = 0;

  input = { left: false, right: false };
  private jumpQueued = false;

  p = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    dir: 1 as 1 | -1,
    onGround: true,
    jumps: 0,
    phase: 0,
    flip: 0,
    flipping: false,
    hurt: 0,
    squash: 0,
    bigScale: 1,
    down: 0,
    bubble: null as { text: string; t: number; dur: number } | null,
    chatterT: 2,
    aiTarget: 0,
    aiT: 0,
  };

  items: Item[] = [];
  pops: Pop[] = [];
  parts: Particle[] = [];
  private stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.55, z: Math.random() }));
  private clouds = Array.from({ length: 5 }, () => ({ x: Math.random(), y: rand(0.08, 0.38), w: rand(0.7, 1.3), v: rand(4, 10) }));
  private windows = Array.from({ length: 64 }, () => Math.random() < 0.82);
  private hudKey = "";
  private hudClock = 0;

  resize(W: number, H: number) {
    const first = this.W === 0;
    const kx = first ? 1 : W / this.W;
    this.W = W;
    this.H = H;
    this.s = clamp(Math.min(H / 820, W / 720), 0.6, 1.15);
    this.horizonY = Math.round(H * (W < 640 ? 0.66 : 0.63));
    this.groundY = Math.round(H - Math.max(56, H * 0.12));
    if (first) {
      this.p.x = W * 0.5;
      this.p.aiTarget = W * 0.3;
    } else {
      this.p.x = clamp(this.p.x * kx, 30, W - 30);
      for (const it of this.items) it.x *= kx;
    }
    if (this.p.onGround) this.p.y = this.groundY;
  }

  // ---------- control ----------

  start() {
    this.phase = "play";
    this.score = 0;
    this.lives = MAX_LIVES;
    this.combo = 0;
    this.bigT = 0;
    this.playTime = 0;
    this.spawnT = 0.8;
    this.items = [];
    this.paused = false;
    Object.assign(this.p, { vx: 0, vy: 0, hurt: 0, down: 0, flip: 0, flipping: false, jumps: 0, bigScale: 1 });
    this.p.y = this.groundY;
    this.p.onGround = true;
    this.say("Watch this. Tremendous.", 2);
    this.pop(this.W / 2, this.H * 0.32, "LET'S GO!", "#ffffff", 64, true, 1.1);
    this.emitHud(true);
  }

  jump() {
    if (this.phase === "over") return;
    this.jumpQueued = true;
  }

  private doJump() {
    const p = this.p;
    if (p.onGround) {
      p.vy = -1020 * this.s;
      p.onGround = false;
      p.jumps = 1;
      p.squash = -0.25;
    } else if (p.jumps < 2) {
      p.vy = -900 * this.s;
      p.jumps = 2;
      p.flipping = true;
      p.flip = 0;
      if (Math.random() < 0.3) this.say(pick(["Very athletic!", "Like a gymnast!", "Perfect flip. Perfect."]), 1.4);
    }
  }

  say(text: string, dur = 2.2) {
    this.p.bubble = { text, t: 0, dur };
  }

  private pop(x: number, y: number, text: string, color: string, size: number, serif = false, dur = 0.9) {
    this.pops.push({ x, y, text, t: 0, dur, color, size: size * this.s, serif });
  }

  // ---------- update ----------

  update(dt: number) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    for (const c of this.clouds) c.x = (c.x + (c.v * dt) / Math.max(this.W, 1) + 1.2) % 1.2;
    this.updateFx(dt);
    if (this.paused) return;

    if (this.phase === "play") {
      this.playTime += dt;
      this.bigT = Math.max(0, this.bigT - dt);
      this.spawn(dt);
    } else if (this.phase === "attract") {
      this.spawnAttract(dt);
      this.ai(dt);
    }
    this.updatePlayer(dt);
    this.updateItems(dt);

    this.hudClock += dt;
    if (this.hudClock > 0.08) {
      this.hudClock = 0;
      this.emitHud();
    }
  }

  private spawn(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const d = clamp(this.playTime / 100, 0, 1);
    this.spawnT = lerp(0.95, 0.36, d) * rand(0.7, 1.3);
    const hazardChance = lerp(0.2, 0.42, d);
    let kind: ItemKind;
    if (Math.random() < hazardChance) kind = Math.random() < 0.7 ? "news" : "windmill";
    else {
      const r = Math.random();
      kind = r < 0.68 ? "burger" : r < 0.9 ? "coke" : r < 0.96 || this.bigT > 0 ? "covfefe" : "sharpie";
    }
    this.addItem(kind, lerp(180, 380, d));
  }

  private spawnAttract(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = rand(1.3, 2.6);
    this.addItem(Math.random() < 0.8 ? "burger" : "coke", 150);
  }

  private addItem(kind: ItemKind, speed: number) {
    const s = this.s;
    const r = { burger: 22, coke: 19, covfefe: 21, sharpie: 22, news: 27, windmill: 30 }[kind] * s;
    const m = 50 * s;
    this.items.push({
      kind,
      x: rand(m, this.W - m),
      y: -r * 2,
      vx: kind === "news" ? rand(-40, 40) * s : 0,
      vy: speed * s * rand(0.85, 1.2) * (kind === "windmill" ? 0.8 : 1),
      rot: rand(-0.4, 0.4),
      spin: kind === "news" ? rand(-2.5, 2.5) : kind === "windmill" ? 0 : rand(-1.5, 1.5),
      r,
    });
  }

  private ai(dt: number) {
    const p = this.p;
    p.aiT -= dt;
    let target = p.aiTarget;
    let best = Infinity;
    for (const it of this.items) {
      if (HAZARD(it.kind)) continue;
      const tLand = (this.groundY - it.y) / it.vy;
      const reach = Math.abs(it.x - p.x) / (380 * this.s);
      if (tLand > reach && tLand < best) {
        best = tLand;
        target = it.x;
      }
    }
    if (best === Infinity && p.aiT <= 0) {
      p.aiT = rand(1.2, 3);
      p.aiTarget = rand(this.W * 0.1, this.W * 0.9);
      if (Math.random() < 0.35) this.jump();
    }
    const dx = target - p.x;
    this.input.left = dx < -12;
    this.input.right = dx > 12;
    if (best < 0.45 && p.onGround && Math.abs(dx) < 40 && Math.random() < 0.02) this.jump();
  }

  private updatePlayer(dt: number) {
    const p = this.p;
    const s = this.s;
    const over = this.phase === "over";
    if (this.jumpQueued) {
      this.jumpQueued = false;
      if (!over && !p.down) this.doJump();
    }
    const move = over ? 0 : (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const max = (this.phase === "attract" ? 300 : 430) * s;
    if (move !== 0) {
      p.vx += move * 3400 * s * dt;
      p.vx = clamp(p.vx, -max, max);
      p.dir = move > 0 ? 1 : -1;
    } else {
      const f = (p.onGround ? 3000 : 900) * s * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }
    p.vy += 2700 * s * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const m = 24 * s;
    if (p.x < m) {
      p.x = m;
      p.vx = 0;
    } else if (p.x > this.W - m) {
      p.x = this.W - m;
      p.vx = 0;
    }
    if (p.y >= this.groundY) {
      if (!p.onGround && p.vy > 300 * s) p.squash = Math.min(0.35, p.vy / (3000 * s));
      p.y = this.groundY;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
      p.flipping = false;
      p.flip = 0;
    } else p.onGround = false;

    if (p.flipping) {
      p.flip += dt * Math.PI * 4.2 * p.dir;
      if (Math.abs(p.flip) >= Math.PI * 2) {
        p.flip = 0;
        p.flipping = false;
      }
    }
    p.phase += (Math.abs(p.vx) * dt) / (26 * s);
    p.squash += (0 - p.squash) * Math.min(1, dt * 9);
    p.hurt = Math.max(0, p.hurt - dt);
    p.bigScale += ((this.bigT > 0 ? 1.75 : 1) - p.bigScale) * Math.min(1, dt * 6);
    if (over) p.down = Math.min(1, p.down + dt * 3);

    if (p.bubble) {
      p.bubble.t += dt;
      if (p.bubble.t > p.bubble.dur) p.bubble = null;
    }
    p.chatterT -= dt;
    if (p.chatterT <= 0 && !p.bubble && !over) {
      p.chatterT = this.phase === "attract" ? rand(3, 5.5) : rand(7, 12);
      this.say(pick(CHATTER), 2.4);
    }
  }

  get headH() {
    return 92 * this.s * this.p.bigScale;
  }

  private bodyBox() {
    const s = this.s;
    const p = this.p;
    const neckY = p.y - 118 * s;
    const hr = this.headH * 0.44;
    return { hx: p.x, hy: neckY - this.headH * 0.36, hr, x1: p.x - 22 * s, x2: p.x + 22 * s, y1: neckY, y2: p.y };
  }

  private updateItems(dt: number) {
    const b = this.bodyBox();
    const keep: Item[] = [];
    for (const it of this.items) {
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += it.spin * dt;
      if (it.kind === "windmill") it.rot = Math.sin(this.time * 2 + it.x) * 0.15;
      const r = it.r * 0.8;
      const dh = Math.hypot(it.x - b.hx, it.y - b.hy);
      const cx = clamp(it.x, b.x1, b.x2);
      const cy = clamp(it.y, b.y1, b.y2);
      const hit = this.phase !== "over" && (dh < b.hr + r || Math.hypot(it.x - cx, it.y - cy) < r);
      if (hit && this.collect(it)) continue;
      if (it.y + it.r * 0.6 >= this.groundY) {
        this.land(it);
        continue;
      }
      keep.push(it);
    }
    this.items = this.phase === "over" ? keep.filter((i) => !HAZARD(i.kind)) : keep;
  }

  /** Returns false when the item should keep falling (e.g. passes through while invulnerable). */
  private collect(it: Item): boolean {
    const p = this.p;
    const s = this.s;
    const b = this.bodyBox();
    if (HAZARD(it.kind)) {
      if (this.bigT > 0 && this.phase === "play") {
        this.burst(it.x, it.y, 18, ["#ffffff", "#d9d4c7", "#ffbd00"]);
        this.pop(it.x, it.y - 20 * s, "WRONG!", "#ffbd00", 28);
        this.score += 5;
        return true;
      }
      if (p.hurt > 0 || this.phase !== "play") return false;
      this.lives--;
      this.combo = 0;
      p.hurt = 1.6;
      p.vy = -640 * s;
      p.vx = (p.x < it.x ? -1 : 1) * 380 * s;
      p.onGround = false;
      this.shake = 0.8;
      const text = pick(HIT[it.kind as "news" | "windmill"]);
      this.pop(b.hx, b.hy - b.hr - 20 * s, text, "#ff5a5a", 34);
      this.say(text, 1.6);
      this.burst(it.x, it.y, 14, ["#ffffff", "#c9c4b6", "#ff5a5a"]);
      if (this.lives <= 0) {
        this.phase = "over";
        this.say("I'm not fired. I quit!", 3);
      }
      this.emitHud(true);
      return true;
    }

    if (it.kind === "sharpie") {
      this.bigT = BIG_TIME;
      this.pop(this.W / 2, this.H * 0.3, "BIGLY MODE!", "#ffbd00", 64, true, 1.3);
      this.say(pick(CATCH.sharpie), 1.6);
      this.burst(it.x, it.y, 34, CONFETTI);
      this.emitHud(true);
      return true;
    }

    const base = POINTS[it.kind] ?? 0;
    if (this.phase === "play") {
      this.combo++;
      const mult = this.mult;
      this.score += base * mult;
      this.pop(it.x, it.y - 34 * s, `+${base * mult}`, "#ffffff", 24);
      const milestone = COMBO.find(([n]) => n === this.combo);
      if (milestone) this.pop(this.W / 2, this.H * 0.3, milestone[1], "#ffffff", 56, true, 1.3);
    }
    if (Math.random() < 0.6 || it.kind !== "burger")
      this.pop(it.x, it.y - 62 * s, pick(CATCH[it.kind as "burger" | "coke" | "covfefe"]), "#ffbd00", 28);
    this.burst(it.x, it.y, it.kind === "covfefe" ? 30 : 14, CONFETTI);
    p.squash = -0.12;
    this.emitHud(true);
    return true;
  }

  get mult() {
    return Math.min(5, 1 + Math.floor(this.combo / 4));
  }

  private land(it: Item) {
    if (HAZARD(it.kind)) {
      this.dust(it.x, this.groundY, it.kind === "windmill" ? 1 : 0.5);
      if (it.kind === "windmill") this.shake = Math.max(this.shake, 0.3);
      return;
    }
    this.dust(it.x, this.groundY, 0.35);
    if (this.phase === "play" && this.combo > 0) {
      if (this.combo >= 3) this.pop(it.x, this.groundY - 30 * this.s, "COMBO LOST. SAD!", "#d9dee8", 20);
      this.combo = 0;
      this.emitHud(true);
    }
  }

  private burst(x: number, y: number, n: number, colors: string[]) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 460) * this.s;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 200 * this.s,
        life: 0,
        max: rand(0.6, 1.2),
        size: rand(3, 7) * this.s,
        color: pick(colors),
        rot: rand(0, 6),
        spin: rand(-12, 12),
        kind: "confetti",
      });
    }
  }

  private dust(x: number, y: number, power: number) {
    const n = Math.round(6 + power * 12);
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const sp = rand(40, 200) * (0.5 + power) * this.s;
      this.parts.push({
        x,
        y: y - 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.4,
        life: 0,
        max: rand(0.4, 0.8),
        size: rand(4, 10) * (0.6 + power) * this.s,
        color: Math.random() < 0.5 ? "#6f8b5e" : "#a9b48f",
        rot: 0,
        spin: 0,
        kind: "dust",
      });
    }
  }

  private updateFx(dt: number) {
    for (const f of this.parts) {
      f.life += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      if (f.kind === "confetti") {
        f.vx *= 0.97;
        f.vy = f.vy * 0.97 + 900 * this.s * dt;
      } else {
        f.vx *= 0.9;
        f.vy = f.vy * 0.9 - 30 * dt;
      }
    }
    this.parts = this.parts.filter((f) => f.life < f.max);
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter((p) => p.t < p.dur);
    this.shake = Math.max(0, this.shake - dt * 2.4);
  }

  emitHud(force = false) {
    const h: Hud = {
      phase: this.phase,
      score: this.score,
      lives: this.lives,
      combo: this.combo,
      mult: this.mult,
      big: Math.ceil(this.bigT),
    };
    const key = `${h.phase}|${h.score}|${h.lives}|${h.combo}|${h.big}`;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    this.onHud?.(h);
  }

  // ---------- render ----------

  render(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    ctx.save();
    if (this.shake > 0) {
      const m = this.shake * this.shake * 12;
      ctx.translate(rand(-m, m), rand(-m, m));
    }
    this.drawSky(ctx);
    this.drawHouseScene(ctx);
    this.drawLawn(ctx);

    for (const it of this.items) this.drawShadow(ctx, it.x, it.y, it.r);
    this.drawShadow(ctx, this.p.x, this.p.y, 34 * this.s);

    for (const it of this.items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      drawItem(ctx, it.kind, it.r, this.time, true);
      ctx.restore();
    }

    this.drawPlayer(ctx);
    this.drawHedge(ctx);
    this.drawParticles(ctx);
    this.drawPops(ctx);
    this.drawBubble(ctx);
    ctx.restore();

    if (this.bigT > 0 && this.phase === "play") {
      const a = 0.12 + 0.06 * Math.sin(this.time * 10);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(255,189,0,0)");
      g.addColorStop(1, `rgba(255,189,0,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    const { W, H, horizonY } = this;
    const g = ctx.createLinearGradient(0, 0, 0, horizonY);
    g.addColorStop(0, "#0a1029");
    g.addColorStop(0.45, "#16224f");
    g.addColorStop(0.75, "#3b3f78");
    g.addColorStop(0.92, "#b46a72");
    g.addColorStop(1, "#f0a96f");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, horizonY + 20);

    for (const st of this.stars) {
      ctx.globalAlpha = (0.25 + st.z * 0.6) * (0.6 + 0.4 * Math.sin(this.time * (1 + st.z * 2) + st.x * 50));
      ctx.fillStyle = "#fff";
      const sz = 0.8 + st.z * 1.4;
      ctx.fillRect(st.x * W, st.y * H, sz, sz);
    }
    ctx.globalAlpha = 1;

    const mx = W * 0.86;
    const my = H * (W < 640 ? 0.54 : 0.14);
    const mr = 26 * this.s;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    glow.addColorStop(0, "rgba(255,244,214,0.35)");
    glow.addColorStop(1, "rgba(255,244,214,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6dc";
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16224f";
    ctx.beginPath();
    ctx.arc(mx + mr * 0.45, my - mr * 0.2, mr * 0.9, 0, Math.PI * 2);
    ctx.fill();

    for (const c of this.clouds) {
      const x = c.x * W * 1.2 - W * 0.1;
      const y = c.y * H;
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#dfe6ff";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(x + (i - 1.5) * 50 * c.w * this.s, y + Math.sin(i * 2.2) * 8, 70 * c.w * this.s, 18 * this.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawHouseScene(ctx: CanvasRenderingContext2D) {
    const { W, H, horizonY } = this;
    const s = this.s;
    ctx.fillStyle = "#101c2e";
    ctx.beginPath();
    for (let x = -20; x <= W + 40; x += 26 * s) {
      const r = (16 + 8 * Math.sin(x * 0.05) + 6 * Math.sin(x * 0.13)) * s;
      ctx.moveTo(x + r, horizonY - r * 0.4);
      ctx.arc(x, horizonY - r * 0.4, r, 0, Math.PI * 2);
    }
    ctx.fill();

    const hw = Math.min(W * 0.62, 760, H * 0.56);
    drawWhiteHouse(ctx, W / 2, horizonY, hw, this.time, this.windows);

    const treeY = horizonY + 4 * s;
    for (const side of [-1, 1]) {
      const bx = W / 2 + side * (hw / 2 + 10 * s);
      drawTreeCluster(ctx, bx, treeY, 70 * s, side);
      drawTreeCluster(ctx, bx + side * 110 * s, treeY + 6 * s, 82 * s, side);
      if (W > 900) drawTreeCluster(ctx, bx + side * 230 * s, treeY + 4 * s, 64 * s, side);
    }
  }

  private drawLawn(ctx: CanvasRenderingContext2D) {
    const { W, H, horizonY, groundY } = this;
    const s = this.s;
    const g = ctx.createLinearGradient(0, horizonY, 0, H);
    g.addColorStop(0, "#21402c");
    g.addColorStop(0.5, "#2c5a36");
    g.addColorStop(1, "#1d3f27");
    ctx.fillStyle = g;
    ctx.fillRect(-20, horizonY, W + 40, H - horizonY + 20);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, horizonY, W + 40, H - horizonY + 20);
    ctx.clip();
    const vx = W / 2;
    const vy = horizonY - (H - horizonY) * 1.6;
    const n = 18;
    for (let i = -n; i <= n; i++) {
      if (i % 2) continue;
      const x1 = W / 2 + (i / n) * W * 1.6;
      const x2 = W / 2 + ((i + 1) / n) * W * 1.6;
      const t = (horizonY - vy) / (H + 40 - vy);
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath();
      ctx.moveTo(vx + (x1 - vx) * t, horizonY);
      ctx.lineTo(vx + (x2 - vx) * t, horizonY);
      ctx.lineTo(x2, H + 40);
      ctx.lineTo(x1, H + 40);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const fy = lerp(horizonY, groundY, 0.38);
    const fr = 70 * s;
    ctx.fillStyle = "#16301f";
    ctx.beginPath();
    ctx.ellipse(W / 2, fy + 6 * s, fr * 1.15, fr * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9d4c7";
    ctx.beginPath();
    ctx.ellipse(W / 2, fy, fr, fr * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d6f9e";
    ctx.beginPath();
    ctx.ellipse(W / 2, fy - 1 * s, fr * 0.9, fr * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(220,238,255,0.75)";
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 1.6;
      const hgt = (40 + 10 * Math.sin(this.time * 6 + i)) * s;
      ctx.beginPath();
      ctx.moveTo(W / 2, fy - 2 * s);
      ctx.quadraticCurveTo(W / 2 + a * 30 * s, fy - hgt * 1.6, W / 2 + a * 55 * s, fy - 2 * s);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(230,244,255,0.9)";
    ctx.fillRect(W / 2 - 2 * s, fy - 54 * s, 4 * s, 52 * s);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(-20, groundY, W + 40, 2);
  }

  private drawHedge(ctx: CanvasRenderingContext2D) {
    const { W, H, groundY } = this;
    const s = this.s;
    const top = groundY + 14 * s;
    ctx.fillStyle = "#132a1b";
    ctx.fillRect(-20, top + 10 * s, W + 40, H - top);
    ctx.fillStyle = "#18341f";
    for (let x = -20; x < W + 40; x += 36 * s) {
      ctx.beginPath();
      ctx.arc(x, top + 16 * s + Math.sin(x) * 3 * s, 22 * s, Math.PI, 0);
      ctx.fill();
    }
    for (let x = 10; x < W; x += 52 * s) {
      ctx.fillStyle = Math.sin(x * 7.1) > 0 ? "#c8102e" : "#ffffff";
      ctx.beginPath();
      ctx.arc(x, top + 4 * s + Math.cos(x) * 4 * s, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const k = clamp(1 - (this.groundY - y) / (this.H * 0.8), 0.15, 1);
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(x, this.groundY + 2, r * (0.5 + k * 0.6), 5 * this.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.p;
    const s = this.s;
    if (p.hurt > 0 && Math.floor(p.hurt * 14) % 2 === 0 && this.phase !== "over") return;
    const dir = p.dir;
    const running = p.onGround && Math.abs(p.vx) > 20 * s;
    const air = !p.onGround;
    const ph = p.phase;

    const thigh = 25 * s;
    const shin = 25 * s;
    const torso = 54 * s;
    const sq = 1 + p.squash;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.down > 0) {
      ctx.translate(0, -6 * s * p.down);
      ctx.rotate(-dir * (Math.PI / 2) * easeOutBack(p.down));
    }
    if (p.flip) {
      ctx.translate(0, -70 * s);
      ctx.rotate(p.flip);
      ctx.translate(0, 70 * s);
    }
    ctx.scale(1 / Math.sqrt(sq), sq);

    const legs: [number, number][] = [];
    for (let i = 0; i < 2; i++) {
      const lp = ph + i * Math.PI;
      if (air) legs.push([i ? -0.5 : 0.7, 1.1]);
      else if (running) legs.push([0.65 * Math.sin(lp), 0.15 + 1.0 * Math.max(0, Math.cos(lp))]);
      else legs.push([i ? -0.08 : 0.1, 0.05]);
    }
    let maxFoot = 0;
    const knees: [number, number][] = [];
    const feet: [number, number][] = [];
    for (const [a, bend] of legs) {
      const kx = Math.sin(a) * thigh * dir;
      const ky = Math.cos(a) * thigh;
      const sa = a - bend;
      const fx = kx + Math.sin(sa) * shin * dir;
      const fy = ky + Math.cos(sa) * shin;
      knees.push([kx, ky]);
      feet.push([fx, fy]);
      maxFoot = Math.max(maxFoot, fy);
    }
    const bob = running ? Math.abs(Math.sin(ph)) * 4 * s : 0;
    const hipY = -maxFoot - 6 * s - bob;
    const lean = running ? 0.12 * Math.sign(p.vx) : air ? 0.05 * dir : 0;
    const neckX = Math.sin(lean) * torso;
    const neckY = hipY - Math.cos(lean) * torso;

    const suit = "#1c2547";
    const suitDark = "#121a35";
    const pants = "#161d36";
    const skin = "#f0b07e";

    const drawLeg = (i: number) => {
      ctx.strokeStyle = pants;
      ctx.lineWidth = 12 * s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(knees[i][0], hipY + knees[i][1]);
      ctx.lineTo(feet[i][0], hipY + feet[i][1]);
      ctx.stroke();
      ctx.fillStyle = "#0b0b0f";
      ctx.beginPath();
      ctx.ellipse(feet[i][0] + 6 * s * dir, hipY + feet[i][1] + 3 * s, 10 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const talking = !!p.bubble && p.onGround && !running;
    const arm = (i: number) => {
      const back = i === 0;
      let a: number;
      let f: number;
      if (air) {
        a = back ? 2.6 : 2.9;
        f = 0.3;
      } else if (running) {
        a = 0.8 * Math.sin(ph + (back ? 0 : Math.PI));
        f = a + 0.9;
      } else if (talking && !back) {
        a = 1.45 + 0.18 * Math.sin(this.time * 9);
        f = a + 0.25 * Math.sin(this.time * 9);
      } else {
        a = back ? -0.15 : 0.15;
        f = a + 0.3;
      }
      const sx = neckX + (back ? -6 : 8) * s * dir;
      const sy = neckY + 6 * s;
      const ex = sx + Math.sin(a) * 22 * s * dir;
      const ey = sy + Math.cos(a) * 22 * s;
      const hx = ex + Math.sin(f) * 21 * s * dir;
      const hy = ey + Math.cos(f) * 21 * s;
      ctx.strokeStyle = back ? suitDark : suit;
      ctx.lineWidth = 11 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hx, hy, 5.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(hx + Math.sin(f) * 4 * s * dir, hy + Math.cos(f) * 4 * s, 6 * s, 0, Math.PI * 2);
      ctx.fill();
      if (talking && !back) {
        ctx.strokeStyle = skin;
        ctx.lineWidth = 3.5 * s;
        ctx.beginPath();
        ctx.moveTo(hx + Math.sin(f) * 6 * s * dir, hy + Math.cos(f) * 6 * s);
        ctx.lineTo(hx + Math.sin(f) * 15 * s * dir, hy + Math.cos(f) * 15 * s);
        ctx.stroke();
      }
    };

    arm(0);
    drawLeg(1);

    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    const sh = 22 * s;
    const hp = 19 * s;
    const jacket = ctx.createLinearGradient(-sh, 0, sh, 0);
    jacket.addColorStop(0, suitDark);
    jacket.addColorStop(0.5, suit);
    jacket.addColorStop(1, suitDark);
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(-sh, -torso + 2 * s);
    ctx.quadraticCurveTo(0, -torso - 6 * s, sh, -torso + 2 * s);
    ctx.lineTo(hp + 2 * s, 8 * s);
    ctx.lineTo(-hp - 2 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-9 * s, -torso);
    ctx.lineTo(9 * s, -torso);
    ctx.lineTo(0, -torso + 26 * s);
    ctx.closePath();
    ctx.fill();
    const sway = running ? Math.sin(ph * 2) * 0.12 - Math.sign(p.vx) * 0.12 : air ? -0.5 * dir : Math.sin(this.time * 2) * 0.03;
    ctx.save();
    ctx.translate(0, -torso + 3 * s);
    ctx.rotate(sway);
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.moveTo(-4 * s, 0);
    ctx.lineTo(4 * s, 0);
    ctx.lineTo(2.5 * s, 6 * s);
    ctx.lineTo(7 * s, 60 * s);
    ctx.lineTo(0, 68 * s);
    ctx.lineTo(-7 * s, 60 * s);
    ctx.lineTo(-2.5 * s, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-1 * s, 8 * s, 2 * s, 52 * s);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-9 * s, -torso);
    ctx.lineTo(-3 * s, -torso + 30 * s);
    ctx.moveTo(9 * s, -torso);
    ctx.lineTo(3 * s, -torso + 30 * s);
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(-13 * s * dir, -torso + 14 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawLeg(0);
    arm(1);

    const hh = this.headH;
    const img = this.head;
    const tilt = running ? Math.sin(ph * 2) * 0.07 : talking ? Math.sin(this.time * 6) * 0.05 : Math.sin(this.time * 1.6) * 0.03;
    ctx.save();
    ctx.translate(neckX, neckY + 6 * s);
    ctx.rotate(lean * 0.6 + tilt);
    const hs = 1 - p.squash * 0.6;
    ctx.scale((dir === 1 ? 1 : -1) / Math.sqrt(hs), hs);
    if (this.bigT > 0) {
      ctx.shadowColor = "rgba(255,189,0,0.9)";
      ctx.shadowBlur = 30;
    }
    if (img?.complete && img.naturalWidth > 0) {
      const hw = hh * (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(img, -hw * 0.5, -hh * 0.9, hw, hh);
    } else {
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, -hh * 0.45, hh * 0.42, hh * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (p.down >= 1) {
      for (let i = 0; i < 4; i++) {
        const a = this.time * 4 + (i * Math.PI) / 2;
        ctx.fillStyle = "#ffbd00";
        drawStar(ctx, neckX + Math.cos(a) * 40 * s, neckY - hh * 0.95 + Math.sin(a) * 10 * s, 7 * s);
      }
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const f of this.parts) {
      const k = 1 - f.life / f.max;
      if (f.kind === "dust") {
        ctx.globalAlpha = k * 0.5;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * (1.5 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.fillStyle = f.color;
        ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawPops(ctx: CanvasRenderingContext2D) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of this.pops) {
      const k = p.t / p.dur;
      const sc = easeOutBack(Math.min(1, p.t / 0.25));
      const alpha = Math.min(1, (1 - k) * 3);
      const y = p.y - k * 40 * this.s;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(clamp(p.x, 90, this.W - 90), y);
      ctx.scale(sc, sc);
      ctx.font = p.serif ? `italic 400 ${p.size}px ${this.serif}` : `700 ${p.size}px ${this.font}`;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0d132d";
      ctx.lineWidth = p.serif ? 8 : 6;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  private drawBubble(ctx: CanvasRenderingContext2D) {
    const b = this.p.bubble;
    if (!b) return;
    const p = this.p;
    const s = this.s;
    const pop = easeOutBack(Math.min(1, b.t / 0.22));
    const alpha = Math.min(1, b.t / 0.12, (b.dur - b.t) / 0.25);
    if (alpha <= 0) return;
    const size = Math.round(clamp(15 * s, 13, 17));
    ctx.font = `600 ${size}px ${this.font}`;
    const lines = wrap(ctx, b.text, 220);
    const lh = size * 1.3;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 26;
    const h = lines.length * lh + 18;
    const down = p.down >= 1;
    const ax = down ? p.x - p.dir * 60 * s : p.x;
    const ay = down ? p.y - 40 * s : p.y - 118 * s - this.headH * 0.95;
    const bx = clamp(ax - w / 2, 8, this.W - w - 8);
    const by = Math.max(8, ay - h - 14);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ax, ay);
    ctx.scale(pop, pop);
    ctx.translate(-ax, -ay);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 14;
    roundRect(ctx, bx, by, w, h, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    const tx = clamp(ax, bx + 16, bx + w - 16);
    ctx.beginPath();
    ctx.moveTo(tx - 8, by + h - 1);
    ctx.lineTo(tx + 8, by + h - 1);
    ctx.lineTo(tx, by + h + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0d132d";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + 13, by + 10 + i * lh));
    ctx.restore();
  }
}

// ---------- shared drawing ----------

export function drawItem(ctx: CanvasRenderingContext2D, kind: ItemKind, r: number, t: number, glow = false) {
  if (glow && (kind === "news" || kind === "windmill")) {
    ctx.shadowColor = "rgba(255,60,60,0.85)";
    ctx.shadowBlur = 16;
  } else if (glow && (kind === "sharpie" || kind === "covfefe")) {
    ctx.shadowColor = "rgba(255,189,0,0.95)";
    ctx.shadowBlur = 22;
  }
  if (kind === "burger") drawBurger(ctx, r);
  else if (kind === "coke") drawCoke(ctx, r);
  else if (kind === "covfefe") drawCovfefe(ctx, r, t);
  else if (kind === "sharpie") drawSharpie(ctx, r);
  else if (kind === "news") drawNews(ctx, r);
  else drawWindmill(ctx, r, t);
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
}

function drawBurger(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = "#d98f33";
  roundRect(ctx, -r * 0.95, r * 0.42, r * 1.9, r * 0.36, r * 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#5a2f17";
  roundRect(ctx, -r, r * 0.12, r * 2, r * 0.36, r * 0.18);
  ctx.fill();
  ctx.fillStyle = "#ffcf33";
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.04);
  ctx.lineTo(r, r * 0.04);
  ctx.lineTo(r * 0.75, r * 0.2);
  ctx.lineTo(r * 0.45, r * 0.12);
  ctx.lineTo(r * 0.15, r * 0.3);
  ctx.lineTo(-r * 0.2, r * 0.12);
  ctx.lineTo(-r * 0.6, r * 0.24);
  ctx.lineTo(-r * 0.85, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#4fb340";
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, r * 0.02);
  for (let i = 0; i <= 8; i++) ctx.lineTo(-r * 1.05 + (i / 8) * r * 2.1, (i % 2 ? r * 0.12 : -r * 0.02));
  ctx.lineTo(r * 1.05, -r * 0.06);
  ctx.lineTo(-r * 1.05, -r * 0.06);
  ctx.closePath();
  ctx.fill();
  const bun = ctx.createLinearGradient(0, -r * 0.8, 0, 0);
  bun.addColorStop(0, "#f2b45a");
  bun.addColorStop(1, "#d48a2c");
  ctx.fillStyle = bun;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.04, r, r * 0.78, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff6dc";
  for (const [x, y] of [[-0.5, -0.4], [-0.1, -0.6], [0.35, -0.45], [0.05, -0.25], [-0.35, -0.18], [0.6, -0.2]]) {
    ctx.beginPath();
    ctx.ellipse(x * r, y * r, r * 0.07, r * 0.04, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoke(ctx: CanvasRenderingContext2D, r: number) {
  const w = r * 1.05;
  const h = r * 1.8;
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, "#8f969f");
  g.addColorStop(0.35, "#f4f6f8");
  g.addColorStop(0.6, "#c9ced4");
  g.addColorStop(1, "#7d848d");
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#6c737c";
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + r * 0.06, w * 0.42, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d4001a";
  ctx.beginPath();
  ctx.moveTo(-w / 2, r * 0.05);
  ctx.bezierCurveTo(-w * 0.2, -r * 0.35, w * 0.2, r * 0.35, w / 2, -r * 0.1);
  ctx.lineTo(w / 2, r * 0.2);
  ctx.bezierCurveTo(w * 0.2, r * 0.6, -w * 0.2, -r * 0.1, -w / 2, r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.font = `700 ${Math.max(6, r * 0.32)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("DIET", 0, -r * 0.3);
  ctx.textAlign = "start";
}

function drawCovfefe(ctx: CanvasRenderingContext2D, r: number, t: number) {
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, "#b8860b");
  g.addColorStop(0.45, "#ffe28a");
  g.addColorStop(1, "#a87412");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.6);
  ctx.lineTo(r * 0.75, -r * 0.6);
  ctx.lineTo(r * 0.55, r * 0.9);
  ctx.lineTo(-r * 0.55, r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -r * 0.85, -r * 0.82, r * 1.7, r * 0.26, r * 0.08);
  ctx.fill();
  ctx.fillStyle = "#7a4a12";
  ctx.fillRect(-r * 0.66, -r * 0.05, r * 1.32, r * 0.4);
  ctx.fillStyle = "#ffe28a";
  ctx.font = `italic 700 ${r * 0.36}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("covfefe", 0, r * 0.15);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    const x = i * r * 0.35;
    ctx.moveTo(x, -r * 0.95);
    ctx.quadraticCurveTo(x + Math.sin(t * 5 + i) * r * 0.25, -r * 1.2, x, -r * 1.45);
    ctx.stroke();
  }
}

function drawSharpie(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  ctx.rotate(-0.7);
  const L = r * 2.3;
  const w = r * 0.5;
  ctx.fillStyle = "#151515";
  roundRect(ctx, -L / 2, -w / 2, L * 0.72, w, w * 0.3);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#3a3a3a";
  roundRect(ctx, -L / 2 + L * 0.68, -w / 2 - 1, L * 0.32, w + 2, w * 0.4);
  ctx.fill();
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(-L / 2 + L * 0.12, -w / 2, L * 0.42, w * 0.32);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-L / 2 + L * 0.12, w * 0.02, L * 0.42, w * 0.16);
  ctx.fillStyle = "#151515";
  ctx.beginPath();
  ctx.moveTo(-L / 2, -w * 0.25);
  ctx.lineTo(-L / 2 - r * 0.3, 0);
  ctx.lineTo(-L / 2, w * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawNews(ctx: CanvasRenderingContext2D, r: number) {
  const w = r * 2;
  const h = r * 1.45;
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#bdb6a4";
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = "#111";
  ctx.font = `900 ${r * 0.36}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FAKE NEWS", 0, -h * 0.32);
  ctx.fillRect(-w * 0.44, -h * 0.17, w * 0.88, 1.5);
  ctx.fillStyle = "#9b9483";
  ctx.fillRect(-w * 0.44, -h * 0.08, w * 0.38, h * 0.42);
  for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.0, -h * 0.08 + i * h * 0.09, w * 0.44, 1.5);
  ctx.save();
  ctx.rotate(-0.28);
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.strokeRect(-r * 0.6, -r * 0.05, r * 1.2, r * 0.42);
  ctx.fillStyle = "#c8102e";
  ctx.font = `800 ${r * 0.32}px sans-serif`;
  ctx.fillText("FAKE", 0, r * 0.17);
  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawWindmill(ctx: CanvasRenderingContext2D, r: number, t: number) {
  ctx.fillStyle = "#eef0f2";
  ctx.beginPath();
  ctx.moveTo(-r * 0.1, -r * 0.2);
  ctx.lineTo(r * 0.1, -r * 0.2);
  ctx.lineTo(r * 0.18, r * 1.0);
  ctx.lineTo(-r * 0.18, r * 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(0, -r * 0.25);
  ctx.rotate(t * 7);
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.fillStyle = "#f7f8f9";
    ctx.beginPath();
    ctx.moveTo(-r * 0.07, 0);
    ctx.quadraticCurveTo(-r * 0.14, -r * 0.6, 0, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.06, -r * 0.5, r * 0.07, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c8102e";
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, -r * 0.88);
    ctx.lineTo(0, -r * 1.05);
    ctx.lineTo(r * 0.04, -r * 0.88);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#c9ced4";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWhiteHouse(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, t: number, lit: boolean[]) {
  const h = w * 0.27;
  const x0 = cx - w / 2;
  const top = base - h;
  const pw = w * 0.3;

  const glow = ctx.createRadialGradient(cx, base, w * 0.1, cx, base, w * 0.75);
  glow.addColorStop(0, "rgba(255,236,200,0.28)");
  glow.addColorStop(1, "rgba(255,236,200,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(cx - w, base - w * 0.7, w * 2, w * 0.8);

  ctx.fillStyle = "#cfc9ba";
  ctx.fillRect(cx - w * 0.36, top - w * 0.055, w * 0.02, w * 0.05);
  ctx.fillRect(cx + w * 0.34, top - w * 0.055, w * 0.02, w * 0.05);
  ctx.fillRect(cx - w * 0.2, top - w * 0.05, w * 0.018, w * 0.045);
  ctx.fillRect(cx + w * 0.18, top - w * 0.05, w * 0.018, w * 0.045);

  const wall = ctx.createLinearGradient(0, top, 0, base);
  wall.addColorStop(0, "#f7f3ea");
  wall.addColorStop(1, "#ddd6c6");
  ctx.fillStyle = wall;
  ctx.fillRect(x0, top, w, h);
  ctx.fillStyle = "#d3cdbd";
  ctx.fillRect(x0, base - h * 0.26, w, h * 0.26);
  ctx.fillStyle = "#e9e4d8";
  ctx.fillRect(x0 - w * 0.008, top - h * 0.05, w * 1.016, h * 0.06);
  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(x0, top - h * 0.14, w, h * 0.04);
  ctx.fillStyle = "#e3ddcf";
  for (let x = x0 + w * 0.005; x < x0 + w; x += w * 0.012) ctx.fillRect(x, top - h * 0.12, w * 0.004, h * 0.07);
  ctx.fillRect(x0, top - h * 0.05, w, h * 0.012);

  const ww = w * 0.026;
  const wh = h * 0.19;
  let li = 0;
  for (const side of [-1, 1]) {
    const a = side < 0 ? x0 + w * 0.05 : cx + pw / 2 + w * 0.04;
    const b = side < 0 ? cx - pw / 2 - w * 0.04 : x0 + w - w * 0.05;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = a + ((b - a) * (i + 0.5)) / n - ww / 2;
      for (const [yy, hh] of [
        [top + h * 0.13, wh],
        [top + h * 0.44, wh * 0.95],
        [base - h * 0.2, wh * 0.6],
      ] as const) {
        const on = lit[li++ % lit.length];
        ctx.fillStyle = on ? "#ffd27a" : "#5b6070";
        if (on) {
          ctx.shadowColor = "rgba(255,200,110,0.8)";
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, yy, ww, hh);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(120,110,90,0.55)";
        ctx.fillRect(x + ww / 2 - 0.5, yy, 1, hh);
        ctx.fillRect(x, yy + hh / 2 - 0.5, ww, 1);
        if (yy < top + h * 0.2) {
          ctx.fillStyle = "#e9e4d8";
          ctx.beginPath();
          ctx.moveTo(x - ww * 0.25, yy - 2);
          ctx.lineTo(x + ww / 2, yy - wh * 0.32);
          ctx.lineTo(x + ww * 1.25, yy - 2);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  const py0 = top - h * 0.08;
  ctx.fillStyle = "#8c7a58";
  ctx.fillRect(cx - pw / 2, py0, pw, base - h * 0.26 - py0);
  const inner = ctx.createLinearGradient(0, py0, 0, base);
  inner.addColorStop(0, "rgba(255,210,122,0.55)");
  inner.addColorStop(1, "rgba(255,210,122,0.15)");
  ctx.fillStyle = inner;
  ctx.fillRect(cx - pw / 2, py0, pw, base - h * 0.26 - py0);
  for (let i = 0; i < 3; i++) {
    const dx = cx - pw * 0.3 + i * pw * 0.3 - ww / 2;
    ctx.fillStyle = "#ffe0a0";
    ctx.fillRect(dx, top + h * 0.12, ww, wh);
    ctx.fillRect(dx, top + h * 0.46, ww, wh * 1.05);
  }
  ctx.fillStyle = "#f2eee4";
  ctx.beginPath();
  ctx.ellipse(cx, py0, pw * 0.56, h * 0.07, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - pw * 0.56, py0 - 1, pw * 1.12, h * 0.08);
  ctx.fillStyle = "#e3ddcf";
  for (let x = cx - pw * 0.52; x < cx + pw * 0.52; x += w * 0.01) ctx.fillRect(x, py0 - h * 0.1, w * 0.0035, h * 0.06);
  ctx.fillRect(cx - pw * 0.54, py0 - h * 0.11, pw * 1.08, h * 0.02);

  const cols = 6;
  const cw = pw * 0.055;
  for (let i = 0; i < cols; i++) {
    const x = cx - pw / 2 + pw * 0.05 + ((pw * 0.9 - cw) * i) / (cols - 1);
    const cg = ctx.createLinearGradient(x, 0, x + cw, 0);
    cg.addColorStop(0, "#d6d0c1");
    cg.addColorStop(0.45, "#ffffff");
    cg.addColorStop(1, "#cfc8b8");
    ctx.fillStyle = cg;
    ctx.fillRect(x, py0 + h * 0.07, cw, base - h * 0.26 - py0 - h * 0.07);
    ctx.fillStyle = "#f2eee4";
    ctx.fillRect(x - cw * 0.25, py0 + h * 0.07, cw * 1.5, h * 0.03);
  }
  ctx.fillStyle = "#f2eee4";
  ctx.fillRect(cx - pw * 0.52, top + h * 0.4, pw * 1.04, h * 0.035);
  ctx.strokeStyle = "rgba(160,150,130,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = cx - pw * 0.5; x < cx + pw * 0.5; x += w * 0.007) {
    ctx.moveTo(x, top + h * 0.4);
    ctx.lineTo(x, top + h * 0.33);
  }
  ctx.moveTo(cx - pw * 0.5, top + h * 0.33);
  ctx.lineTo(cx + pw * 0.5, top + h * 0.33);
  ctx.stroke();

  ctx.fillStyle = "#c9c2b1";
  for (let i = 0; i < 3; i++) {
    const ax = cx - pw * 0.28 + i * pw * 0.28;
    ctx.fillStyle = "#ffd27a";
    ctx.beginPath();
    ctx.moveTo(ax - ww * 0.7, base - 2);
    ctx.lineTo(ax - ww * 0.7, base - h * 0.14);
    ctx.arc(ax, base - h * 0.14, ww * 0.7, Math.PI, 0);
    ctx.lineTo(ax + ww * 0.7, base - 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#e9e4d8";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * pw * 0.5, base - h * 0.24);
    ctx.quadraticCurveTo(cx + side * pw * 0.78, base - h * 0.2, cx + side * pw * 0.86, base);
    ctx.lineTo(cx + side * pw * 0.62, base);
    ctx.quadraticCurveTo(cx + side * pw * 0.6, base - h * 0.12, cx + side * pw * 0.5, base - h * 0.14);
    ctx.closePath();
    ctx.fill();
  }

  const poleX = cx;
  const poleTop = py0 - h * 0.11 - w * 0.13;
  ctx.fillStyle = "#cfd3d8";
  ctx.fillRect(poleX - 1, poleTop, 2, w * 0.13);
  const fw = w * 0.085;
  const fh = fw * 0.55;
  const slices = 14;
  for (let i = 0; i < slices; i++) {
    const u0 = i / slices;
    const u1 = (i + 1) / slices;
    const off = (u: number) => Math.sin(t * 5 - u * 7) * fh * 0.12 * u;
    for (let sIdx = 0; sIdx < 13; sIdx++) {
      const v0 = sIdx / 13;
      ctx.fillStyle = sIdx % 2 === 0 ? "#c8102e" : "#ffffff";
      if (u0 < 0.42 && sIdx < 7) ctx.fillStyle = "#1f3a8a";
      const x = poleX + 1 + u0 * fw;
      ctx.beginPath();
      ctx.moveTo(x, poleTop + v0 * fh + off(u0));
      ctx.lineTo(poleX + 1 + u1 * fw + 0.5, poleTop + v0 * fh + off(u1));
      ctx.lineTo(poleX + 1 + u1 * fw + 0.5, poleTop + (v0 + 1 / 13) * fh + off(u1) + 0.5);
      ctx.lineTo(x, poleTop + (v0 + 1 / 13) * fh + off(u0) + 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, side: number) {
  const blobs = [
    [0, -0.9, 0.75],
    [-0.55 * side, -0.55, 0.6],
    [0.5 * side, -0.5, 0.62],
    [0.1, -1.45, 0.55],
    [0, -0.25, 0.7],
  ];
  ctx.fillStyle = "#13281c";
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * r, y + by * r, br * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(120,170,120,0.12)";
  for (const [bx, by, br] of blobs) {
    ctx.beginPath();
    ctx.arc(x + bx * r - side * br * r * 0.25, y + by * r - br * r * 0.25, br * r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
