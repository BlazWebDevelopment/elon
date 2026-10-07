import { BONKED, CHATTER, DANCE, GRABBED, LANDED, RUD, WAVE, pick } from "./quotes";

export type Gravity = "earth" | "mars" | "moon" | "zero";

export const GRAVITY: Record<Gravity, number> = {
  earth: 2600,
  mars: 990,
  moon: 430,
  zero: 0,
};

export type EngineStats = {
  count: number;
  thrown: number;
  longestFlight: number;
  rud: number;
};

const HEAD = 0;
const NECK = 1;
const HIP = 2;
const LELB = 3;
const LHAND = 4;
const RELB = 5;
const RHAND = 6;
const LKNEE = 7;
const LFOOT = 8;
const RKNEE = 9;
const RFOOT = 10;
const JOINTS = 11;

const HEAD_ASPECT = 270 / 388;
const STEP = 1 / 120;
const MAX_ELONS = 14;

type Surface = "floor" | "title";
type Mode = "walk" | "idle" | "talk" | "wave" | "dance" | "ragdoll" | "getup";

type Dims = {
  headH: number;
  headW: number;
  neck: number;
  torso: number;
  upper: number;
  fore: number;
  thigh: number;
  shin: number;
  line: number;
  joint: number;
};

type Particle = {
  x: number;
  y: number;
  px: number;
  py: number;
  r: number;
  sinceContact: number;
  surf: Surface | null;
};

type Vec = { x: number; y: number };

type Bubble = { text: string; t: number; dur: number; hot: boolean };

type Fx = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  spark: boolean;
};

const BONES: [number, number, keyof Dims][] = [
  [HEAD, NECK, "neck"],
  [NECK, HIP, "torso"],
  [NECK, LELB, "upper"],
  [LELB, LHAND, "fore"],
  [NECK, RELB, "upper"],
  [RELB, RHAND, "fore"],
  [HIP, LKNEE, "thigh"],
  [LKNEE, LFOOT, "shin"],
  [HIP, RKNEE, "thigh"],
  [RKNEE, RFOOT, "shin"],
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOutBack = (k: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

function makeDims(s: number): Dims {
  const headH = 66 * s;
  return {
    headH,
    headW: headH * HEAD_ASPECT,
    neck: headH * 0.42,
    torso: 50 * s,
    upper: 26 * s,
    fore: 24 * s,
    thigh: 30 * s,
    shin: 30 * s,
    line: Math.max(2.5, 4.4 * s),
    joint: Math.max(2, 3 * s),
  };
}

let nextId = 1;

class Elon {
  id = nextId++;
  s: number;
  d: Dims;
  p: Particle[];
  mode: Mode = "walk";
  t = 0;
  dur = rand(2.5, 5);
  x = 0;
  ground = 0;
  surf: Surface = "floor";
  dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  speed: number;
  phase = Math.random() * Math.PI * 2;
  bubble: Bubble | null = null;
  settle = 0;
  flightStart = -1;
  impactCooldown = 0;
  blendFrom: Vec[] | null = null;
  blendT = 1;
  getFrom: Vec[] | null = null;

  constructor(s: number) {
    this.s = s;
    this.d = makeDims(s);
    this.speed = rand(70, 115) * s;
    this.p = Array.from({ length: JOINTS }, (_, i) => ({
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      r: i === HEAD ? this.d.headH * 0.36 : this.d.joint,
      sinceContact: 1,
      surf: null,
    }));
  }

  say(text: string, dur = 2.4, hot = false) {
    this.bubble = { text, t: 0, dur, hot };
  }

  get procedural() {
    return this.mode !== "ragdoll" && this.mode !== "getup";
  }
}

export class ElonEngine {
  W = 0;
  H = 0;
  floorY = 0;
  titleTop: Float32Array = new Float32Array(0);
  elons: Elon[] = [];
  g = GRAVITY.earth;
  time = 0;
  acc = 0;
  head: HTMLImageElement | null = null;
  font = "sans-serif";
  grab: { e: Elon; i: number; x: number; y: number } | null = null;
  fx: Fx[] = [];
  shake = 0;
  stats: EngineStats = { count: 0, thrown: 0, longestFlight: 0, rud: 0 };
  onStats?: (s: EngineStats) => void;
  private pose: Vec[] = Array.from({ length: JOINTS }, () => ({ x: 0, y: 0 }));

  get baseScale() {
    return clamp(Math.min(this.H / 980, this.W / 760), 0.62, 1.05);
  }

  resize(W: number, H: number, floorY: number) {
    const first = this.W === 0;
    const dx = first ? 1 : W / this.W;
    this.W = W;
    this.H = H;
    this.floorY = floorY;
    if (this.titleTop.length !== Math.ceil(W)) this.titleTop = new Float32Array(Math.ceil(W)).fill(Infinity);
    for (const e of this.elons) {
      if (e.procedural) {
        e.x = clamp(e.x * dx, 40, W - 40);
        if (e.surf === "floor") e.ground = floorY;
        else this.dropIfUnsupported(e);
      } else {
        for (const p of e.p) {
          p.x = clamp(p.x * dx, p.r, W - p.r);
          p.px = p.x;
          if (p.y + p.r > floorY) p.y = p.py = floorY - p.r;
        }
      }
    }
  }

  setTitleTop(profile: Float32Array) {
    this.titleTop = profile;
    for (const e of this.elons) if (e.procedural && e.surf === "title") this.dropIfUnsupported(e);
  }

  private titleAt(x: number) {
    const i = Math.round(x);
    if (i < 0 || i >= this.titleTop.length) return Infinity;
    return this.titleTop[i];
  }

  private dropIfUnsupported(e: Elon) {
    const y = this.titleAt(e.x);
    if (!Number.isFinite(y)) this.toRagdoll(e);
    else e.ground = y;
  }

  populate(n: number) {
    for (let i = 0; i < n; i++) {
      const e = new Elon(this.baseScale * rand(0.85, 1.12));
      e.x = ((i + 0.5) / n) * this.W + rand(-40, 40);
      e.x = clamp(e.x, 60, this.W - 60);
      e.ground = this.floorY;
      e.dur = rand(1, 4);
      this.writePose(e, true);
      this.elons.push(e);
    }
    this.emit();
  }

  spawn(x?: number) {
    if (this.elons.length >= MAX_ELONS) {
      const old = this.elons.find((e) => e !== this.grab?.e);
      if (old) this.elons.splice(this.elons.indexOf(old), 1);
    }
    const e = new Elon(this.baseScale * rand(0.85, 1.12));
    e.x = x ?? rand(80, this.W - 80);
    e.ground = -120;
    e.mode = "idle";
    this.writePose(e, true);
    const spin = rand(-4, 4);
    for (const p of e.p) {
      p.px = p.x - rand(-2, 2) - (p.y - e.ground) * spin * 0.004;
      p.py = p.y - rand(2, 6);
    }
    this.toRagdoll(e);
    e.flightStart = this.time;
    if (Math.random() < 0.6) e.say(pick(["Incoming!", "Wheee!", "Hello from orbit!", "Is this Mars?"]), 1.8);
    this.elons.push(e);
    this.emit();
  }

  chaos() {
    for (const e of this.elons) {
      if (e === this.grab?.e) continue;
      this.toRagdoll(e);
      const vx = rand(-1100, 1100) * STEP;
      const vy = rand(-2300, -1300) * STEP * Math.sqrt(Math.max(this.g, 300) / GRAVITY.earth);
      const spin = rand(-1, 1) * 6 * STEP;
      const hip = e.p[HIP];
      for (const p of e.p) {
        p.px = p.x - vx - (p.y - hip.y) * spin;
        p.py = p.y - vy + (p.x - hip.x) * spin;
      }
      e.flightStart = this.time;
      this.stats.thrown++;
      if (Math.random() < 0.5) e.say(pick(GRABBED), 1.6);
    }
    this.shake = Math.max(this.shake, 0.6);
    this.emit();
  }

  kick(x1: number, x2: number) {
    let any = false;
    for (const e of this.elons) {
      if (e === this.grab?.e) continue;
      const hip = e.p[HIP];
      const onTitle = e.procedural ? e.surf === "title" : e.p.some((p) => p.surf === "title" && p.sinceContact < 0.1);
      if (!onTitle || hip.x < x1 - 10 || hip.x > x2 + 10) continue;
      this.toRagdoll(e);
      const vx = rand(-500, 500) * STEP;
      const vy = rand(-1900, -1300) * STEP;
      for (const p of e.p) {
        p.px = p.x - vx;
        p.py = p.y - vy;
      }
      e.flightStart = this.time;
      e.say(pick(["Whoa!", "Hey!", "Ludicrous!", "Concerning."]), 1.4);
      this.stats.thrown++;
      any = true;
    }
    if (any) this.emit();
  }

  setGravity(g: Gravity) {
    const was = this.g;
    this.g = GRAVITY[g];
    if (this.g === 0 && was !== 0) {
      for (const e of this.elons) {
        if (!e.procedural && e.mode !== "getup") continue;
        this.toRagdoll(e);
        const vy = rand(60, 160) * STEP;
        const spin = rand(-1, 1) * 1.5 * STEP;
        const hip = e.p[HIP];
        for (const p of e.p) {
          p.py = p.y + vy + (p.x - hip.x) * spin;
          p.px = p.x + rand(-1, 1) * 0.3;
        }
        if (Math.random() < 0.5) e.say(pick(["Zero-G!", "Wheee!", "Is this space?"]), 2);
      }
    }
  }

  // ---------- pointer ----------

  hit(x: number, y: number) {
    for (let k = this.elons.length - 1; k >= 0; k--) {
      const e = this.elons[k];
      const h = e.p[HEAD];
      if (Math.hypot(h.x - x, h.y - y) < e.d.headH * 0.55) return { e, i: HEAD };
      let best = -1;
      let bestD = 22;
      for (let i = 1; i < JOINTS; i++) {
        const d = Math.hypot(e.p[i].x - x, e.p[i].y - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) {
        for (const [a, b] of BONES) {
          const d = segDist(x, y, e.p[a], e.p[b]);
          if (d < 14) {
            const da = Math.hypot(e.p[a].x - x, e.p[a].y - y);
            const db = Math.hypot(e.p[b].x - x, e.p[b].y - y);
            best = da < db ? a : b;
            break;
          }
        }
      }
      if (best >= 0) return { e, i: best };
    }
    return null;
  }

  pointerDown(x: number, y: number) {
    const h = this.hit(x, y);
    if (!h) return false;
    this.toRagdoll(h.e);
    this.grab = { e: h.e, i: h.i, x, y };
    this.elons.splice(this.elons.indexOf(h.e), 1);
    this.elons.push(h.e);
    if (Math.random() < 0.55) h.e.say(pick(GRABBED), 1.6);
    return true;
  }

  pointerMove(x: number, y: number) {
    if (!this.grab) return;
    this.grab.x = x;
    this.grab.y = y;
  }

  pointerUp() {
    const g = this.grab;
    if (!g) return;
    this.grab = null;
    const p = g.e.p[g.i];
    const speed = Math.hypot(p.x - p.px, p.y - p.py) / STEP;
    if (speed > 380) {
      this.stats.thrown++;
      g.e.flightStart = this.time;
      if (Math.random() < 0.35) g.e.say(pick(["Wheee!", "Ludicrous speed!", "To Mars!", "Nooo—"]), 1.4);
      this.emit();
    }
  }

  // ---------- simulation ----------

  update(dt: number) {
    this.acc += Math.min(dt, 0.05);
    let n = 0;
    while (this.acc >= STEP && n < 8) {
      this.step(STEP);
      this.acc -= STEP;
      n++;
    }
    for (const f of this.fx) {
      f.life += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= f.spark ? 0.96 : 0.92;
      f.vy = f.vy * (f.spark ? 0.96 : 0.92) + (f.spark ? 900 : -20) * dt;
    }
    this.fx = this.fx.filter((f) => f.life < f.max);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    for (const e of this.elons) {
      if (!e.bubble) continue;
      e.bubble.t += dt;
      if (e.bubble.t > e.bubble.dur) e.bubble = null;
    }
  }

  private step(h: number) {
    this.time += h;
    for (const e of this.elons) {
      e.impactCooldown = Math.max(0, e.impactCooldown - h);
      if (e.procedural) this.stepProcedural(e, h);
      else if (e.mode === "getup") this.stepGetup(e, h);
      else this.stepRagdoll(e, h);
    }
    this.bowling();
  }

  private setMode(e: Elon, mode: Mode, dur: number) {
    e.blendFrom = e.p.map((p) => ({ x: p.x - e.x, y: p.y - e.ground }));
    e.blendT = 0;
    e.mode = mode;
    e.t = 0;
    e.dur = dur;
  }

  private turn(e: Elon) {
    e.blendFrom = e.p.map((p) => ({ x: p.x - e.x, y: p.y - e.ground }));
    e.blendT = 0;
    e.dir = e.dir === 1 ? -1 : 1;
  }

  private decide(e: Elon) {
    const r = Math.random();
    if (r < 0.4) {
      this.setMode(e, "walk", rand(2.5, 6));
      if (Math.random() < 0.3) this.turn(e);
    } else if (r < 0.66) {
      this.setMode(e, "talk", rand(2.2, 3.2));
      e.say(pick(CHATTER), e.dur);
    } else if (r < 0.8) {
      this.setMode(e, "idle", rand(1, 2.4));
      if (Math.random() < 0.3) e.say(pick(CHATTER), e.dur);
    } else if (r < 0.91) {
      this.setMode(e, "wave", 1.8);
      e.say(pick(WAVE), 1.8);
    } else {
      this.setMode(e, "dance", 2.8);
      e.say(pick(DANCE), 2.8);
    }
  }

  private stepProcedural(e: Elon, h: number) {
    e.t += h;
    e.blendT += h;
    if (e.mode === "walk") {
      let nx = e.x + e.dir * e.speed * h;
      if (e.surf === "floor") {
        if ((nx < 50 && e.dir < 0) || (nx > this.W - 50 && e.dir > 0)) {
          this.turn(e);
          nx = e.x;
        }
      } else {
        const gy = this.surfaceAhead(e, nx);
        if (gy === null || gy - e.ground > 16 * e.s) {
          if (Math.random() < 0.55) {
            this.turn(e);
            nx = e.x;
          } else {
            this.toRagdoll(e);
            if (Math.random() < 0.5) e.say(pick(["Whoa—", "Not like this.", "Gravity check!"]), 1.4);
            return;
          }
        } else if (e.ground - gy > 12 * e.s) {
          this.turn(e);
          nx = e.x;
        } else {
          e.ground += (gy - e.ground) * Math.min(1, h * 25);
        }
      }
      e.x = nx;
      e.phase += (e.speed * h) / (e.d.thigh * 1.1);
      if (Math.random() < h * 0.004) {
        this.toRagdoll(e);
        e.say("Whoa—", 1.2);
        return;
      }
    }
    if (e.t > e.dur) {
      if (e.mode === "walk") this.decide(e);
      else this.setMode(e, "walk", rand(2.5, 6));
    }
    this.writePose(e, false);
  }

  private surfaceAhead(e: Elon, nx: number): number | null {
    const here = this.titleAt(nx);
    if (Number.isFinite(here)) return here;
    const bridge = 14 * e.s;
    for (let k = 1; k <= bridge; k++) {
      const y = this.titleAt(nx + e.dir * k);
      if (Number.isFinite(y) && Math.abs(y - e.ground) < 10 * e.s) return e.ground;
    }
    return null;
  }

  private computePose(e: Elon, mode: Mode, t: number, out: Vec[]) {
    const d = e.d;
    const dir = e.dir;
    let lean = 0;
    let tilt = 0;
    const legs: [number, number][] = [
      [0.12, 0.05],
      [-0.1, 0.08],
    ];
    const arms: [number, number][] = [
      [0.14, 0.32],
      [-0.08, 0.22],
    ];

    if (mode === "walk") {
      for (let i = 0; i < 2; i++) {
        const ph = e.phase + i * Math.PI;
        legs[i] = [0.42 * Math.sin(ph), 0.12 + 0.8 * Math.max(0, Math.cos(ph))];
        const a = 0.5 * Math.sin(ph + Math.PI);
        arms[i] = [a, a + 0.35 + 0.25 * Math.max(0, Math.sin(ph + Math.PI))];
      }
      lean = 0.07;
      tilt = 0.05 * Math.sin(e.phase * 2);
    } else if (mode === "idle") {
      tilt = 0.04 * Math.sin(t * 2.2);
      arms[0][0] += 0.04 * Math.sin(t * 2.2);
    } else if (mode === "talk") {
      const a = 1.05 + 0.28 * Math.sin(t * 7);
      arms[1] = [a, a + 0.85 + 0.25 * Math.sin(t * 9.5)];
      tilt = 0.07 * Math.sin(t * 5);
      lean = 0.03;
    } else if (mode === "wave") {
      const a = 2.75;
      arms[1] = [a, a + 0.15 + 0.55 * Math.sin(t * 14)];
      tilt = -0.08;
    } else if (mode === "dance") {
      const k = t * 7.5;
      legs[0] = [0.25 * Math.sin(k), 0.35 + 0.35 * Math.abs(Math.sin(k))];
      legs[1] = [-0.25 * Math.sin(k), 0.35 + 0.35 * Math.abs(Math.cos(k))];
      arms[0] = [2.4 + 0.5 * Math.sin(k), 2.4 + 0.5 * Math.sin(k) + 0.6];
      arms[1] = [2.4 - 0.5 * Math.sin(k), 2.4 - 0.5 * Math.sin(k) + 0.6];
      tilt = 0.28 * Math.sin(k);
      lean = 0.12 * Math.sin(k * 0.5);
    }

    let maxFoot = -Infinity;
    for (let i = 0; i < 2; i++) {
      const [a, bend] = legs[i];
      const kx = Math.sin(a) * d.thigh * dir;
      const ky = Math.cos(a) * d.thigh;
      const sa = a - bend;
      const fx = kx + Math.sin(sa) * d.shin * dir;
      const fy = ky + Math.cos(sa) * d.shin;
      out[i === 0 ? LKNEE : RKNEE].x = kx;
      out[i === 0 ? LKNEE : RKNEE].y = ky;
      out[i === 0 ? LFOOT : RFOOT].x = fx;
      out[i === 0 ? LFOOT : RFOOT].y = fy;
      maxFoot = Math.max(maxFoot, fy);
    }
    const hx = e.x;
    const hy = e.ground - d.joint - maxFoot;
    for (const j of [LKNEE, LFOOT, RKNEE, RFOOT]) {
      out[j].x += hx;
      out[j].y += hy;
    }
    out[HIP].x = hx;
    out[HIP].y = hy;
    out[NECK].x = hx + Math.sin(lean) * d.torso * dir;
    out[NECK].y = hy - Math.cos(lean) * d.torso;
    out[HEAD].x = out[NECK].x + Math.sin(lean + tilt) * d.neck * dir;
    out[HEAD].y = out[NECK].y - Math.cos(lean + tilt) * d.neck;
    for (let i = 0; i < 2; i++) {
      const [a, f] = arms[i];
      const el = out[i === 0 ? LELB : RELB];
      const ha = out[i === 0 ? LHAND : RHAND];
      el.x = out[NECK].x + Math.sin(a) * d.upper * dir;
      el.y = out[NECK].y + Math.cos(a) * d.upper;
      ha.x = el.x + Math.sin(f) * d.fore * dir;
      ha.y = el.y + Math.cos(f) * d.fore;
    }
  }

  private writePose(e: Elon, snap: boolean) {
    const out = this.pose;
    this.computePose(e, e.mode === "getup" ? "idle" : e.mode, e.t, out);
    const k = e.blendFrom && e.blendT < 0.25 ? easeInOut(e.blendT / 0.25) : 1;
    for (let i = 0; i < JOINTS; i++) {
      const p = e.p[i];
      let x = out[i].x;
      let y = out[i].y;
      if (k < 1 && e.blendFrom) {
        x = e.x + e.blendFrom[i].x + (x - e.x - e.blendFrom[i].x) * k;
        y = e.ground + e.blendFrom[i].y + (y - e.ground - e.blendFrom[i].y) * k;
      }
      p.px = snap ? x : p.x;
      p.py = snap ? y : p.y;
      p.x = x;
      p.y = y;
    }
  }

  private toRagdoll(e: Elon) {
    e.mode = "ragdoll";
    e.t = 0;
    e.settle = 0;
    e.getFrom = null;
    for (const p of e.p) p.sinceContact = 1;
  }

  private stepGetup(e: Elon, h: number) {
    e.t += h;
    const k = Math.min(1, e.t / 0.7);
    const out = this.pose;
    this.computePose(e, "idle", e.t, out);
    const from = e.getFrom!;
    const ease = easeOutBack(k);
    for (let i = 0; i < JOINTS; i++) {
      const p = e.p[i];
      p.px = p.x;
      p.py = p.y;
      p.x = from[i].x + (out[i].x - from[i].x) * ease;
      p.y = from[i].y + (out[i].y - from[i].y) * ease;
    }
    if (k >= 1) {
      e.mode = "idle";
      e.t = 0;
      e.dur = rand(0.8, 1.6);
      e.blendFrom = null;
      e.blendT = 1;
      if (Math.random() < 0.4 && !e.bubble) e.say(pick(LANDED), 1.8);
    }
  }

  private startGetup(e: Elon) {
    let low = e.p[0];
    for (const p of e.p) if (p.y + p.r > low.y + low.r) low = p;
    let surf: Surface = low.surf ?? "floor";
    const hip = e.p[HIP];
    const x = clamp(hip.x, 50, this.W - 50);
    let ground = this.floorY;
    if (surf === "title") {
      let found = Infinity;
      for (let k = 0; k < 40 && !Number.isFinite(found); k++) {
        const a = this.titleAt(x + k);
        const b = this.titleAt(x - k);
        found = Number.isFinite(a) ? a : b;
      }
      if (Number.isFinite(found)) ground = found;
      else surf = "floor";
    }
    e.surf = surf;
    e.ground = ground;
    e.x = x;
    e.dir = Math.random() < 0.5 ? 1 : -1;
    e.getFrom = e.p.map((p) => ({ x: p.x, y: p.y }));
    e.mode = "getup";
    e.t = 0;
  }

  private stepRagdoll(e: Elon, h: number) {
    e.t += h;
    const g = this.g;
    const grabbed = this.grab && this.grab.e === e ? this.grab.i : -1;
    const maxStep = 75;

    for (let i = 0; i < JOINTS; i++) {
      const p = e.p[i];
      if (i === grabbed) {
        p.px = p.x;
        p.py = p.y;
        p.x += (this.grab!.x - p.x) * 0.45;
        p.y += (this.grab!.y - p.y) * 0.45;
        continue;
      }
      let vx = (p.x - p.px) * 0.9993;
      let vy = (p.y - p.py) * 0.9993;
      const sp = Math.hypot(vx, vy);
      if (sp > maxStep) {
        vx *= maxStep / sp;
        vy *= maxStep / sp;
      }
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + g * h * h;
    }

    for (let iter = 0; iter < 8; iter++) {
      for (const [a, b, key] of BONES) this.solve(e, a, b, e.d[key], grabbed);
      this.solve(e, HEAD, HIP, e.d.neck + e.d.torso, grabbed);
    }

    let maxImpact = 0;
    let impactAt: Particle | null = null;
    let touched = false;
    const ceiling = this.g === 0 ? 0 : -500;
    for (let i = 0; i < JOINTS; i++) {
      const p = e.p[i];
      const vx = p.x - p.px;
      const vy = p.y - p.py;
      let surface = Infinity;
      let surf: Surface | null = null;
      const tt = this.titleAt(p.x);
      if (Number.isFinite(tt) && p.py + p.r <= tt + 6 && p.y + p.r > tt) {
        surface = tt;
        surf = "title";
      }
      if (p.y + p.r > this.floorY && this.floorY < surface) {
        surface = this.floorY;
        surf = "floor";
      }
      if (surf && i !== grabbed) {
        p.y = surface - p.r;
        const impact = vy / h;
        p.py = p.y + vy * (impact > 260 ? 0.38 : 0);
        p.px = p.x - vx * 0.955;
        p.sinceContact = 0;
        p.surf = surf;
        touched = true;
        if (impact > maxImpact) {
          maxImpact = impact;
          impactAt = p;
        }
      } else {
        p.sinceContact += h;
      }
      if (p.x < p.r) {
        p.x = p.r;
        p.px = p.x + vx * 0.5;
      } else if (p.x > this.W - p.r) {
        p.x = this.W - p.r;
        p.px = p.x + vx * 0.5;
      }
      if (p.y < ceiling + p.r) {
        p.y = ceiling + p.r;
        p.py = p.y + vy * 0.5;
      }
    }

    if (touched && e.flightStart >= 0 && this.time - e.flightStart > 0.08) {
      const flight = this.time - e.flightStart;
      e.flightStart = -1;
      if (flight > this.stats.longestFlight) {
        this.stats.longestFlight = flight;
        this.emit();
      }
    }

    if (impactAt && maxImpact > 1300 && e.impactCooldown <= 0) {
      e.impactCooldown = 0.5;
      this.dust(impactAt.x, impactAt.y + impactAt.r, Math.min(1, maxImpact / 3000));
      if (maxImpact > 2500) {
        this.stats.rud++;
        this.shake = Math.max(this.shake, 0.9);
        this.sparks(impactAt.x, impactAt.y + impactAt.r);
        e.say(pick(RUD), 2, true);
        this.emit();
      } else {
        this.shake = Math.max(this.shake, 0.35);
      }
    }

    if (grabbed >= 0) {
      e.settle = 0;
      return;
    }
    let maxV = 0;
    let contact = false;
    for (const p of e.p) {
      maxV = Math.max(maxV, Math.hypot(p.x - p.px, p.y - p.py) / h);
      if (p.sinceContact < 0.06) contact = true;
    }
    if (contact && (maxV < 45 || (e.t > 6 && maxV < 220))) e.settle += h;
    else e.settle = 0;
    if (e.settle > 0.45 && this.g > 0) this.startGetup(e);
  }

  private solve(e: Elon, a: number, b: number, len: number, pinned: number) {
    const pa = e.p[a];
    const pb = e.p[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const diff = (dist - len) / dist;
    if (a === pinned) {
      pb.x -= dx * diff;
      pb.y -= dy * diff;
    } else if (b === pinned) {
      pa.x += dx * diff;
      pa.y += dy * diff;
    } else {
      pa.x += dx * diff * 0.5;
      pa.y += dy * diff * 0.5;
      pb.x -= dx * diff * 0.5;
      pb.y -= dy * diff * 0.5;
    }
  }

  private bowling() {
    for (const a of this.elons) {
      if (a.procedural || a.mode === "getup") continue;
      const head = a.p[HEAD];
      const vx = (head.x - head.px) / STEP;
      const vy = (head.y - head.py) / STEP;
      if (Math.hypot(vx, vy) < 900) continue;
      for (const b of this.elons) {
        if (b === a || !b.procedural) continue;
        const d = Math.min(
          segDist(head.x, head.y, b.p[NECK], b.p[HIP]),
          Math.hypot(head.x - b.p[HEAD].x, head.y - b.p[HEAD].y),
        );
        if (d > a.d.headH * 0.45 + b.d.headH * 0.2) continue;
        this.toRagdoll(b);
        for (const p of b.p) {
          p.px = p.x - vx * STEP * 0.55;
          p.py = p.y - (vy * 0.4 - 500) * STEP;
        }
        b.flightStart = this.time;
        b.say(pick(BONKED), 1.6);
        this.dust(b.p[HIP].x, b.p[HIP].y, 0.4);
      }
    }
  }

  private dust(x: number, y: number, power: number) {
    const n = Math.round(8 + power * 14);
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const sp = rand(60, 260) * (0.5 + power);
      this.fx.push({
        x,
        y: y - 2,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.5,
        life: 0,
        max: rand(0.5, 1),
        size: rand(4, 11) * (0.6 + power),
        color: Math.random() < 0.5 ? "#9a9da3" : "#5d6066",
        spark: false,
      });
    }
  }

  private sparks(x: number, y: number) {
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const sp = rand(300, 900);
      this.fx.push({
        x,
        y: y - 4,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: rand(0.35, 0.8),
        size: rand(1.5, 3),
        color: Math.random() < 0.6 ? "#ffffff" : "#ffd9a0",
        spark: true,
      });
    }
  }

  private emit() {
    this.stats.count = this.elons.length;
    this.onStats?.({ ...this.stats });
  }

  // ---------- render ----------

  render(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.save();
    if (this.shake > 0) {
      const m = this.shake * this.shake * 10;
      ctx.translate(rand(-m, m), rand(-m, m));
    }

    for (const e of this.elons) this.drawShadow(ctx, e);

    for (const f of this.fx) {
      const k = 1 - f.life / f.max;
      ctx.globalAlpha = k * (f.spark ? 1 : 0.55);
      ctx.fillStyle = f.color;
      if (f.spark) {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = f.size;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x - f.vx * 0.025, f.y - f.vy * 0.025);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * (1.4 - k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const e of this.elons) this.drawElon(ctx, e);
    for (const e of this.elons) this.drawBubble(ctx, e);
    ctx.restore();
  }

  private drawShadow(ctx: CanvasRenderingContext2D, e: Elon) {
    const hip = e.p[HIP];
    let y = this.floorY;
    if (e.procedural || e.mode === "getup") {
      y = e.ground;
    } else {
      const t = this.titleAt(hip.x);
      if (Number.isFinite(t) && t >= hip.y) y = t;
    }
    let low = -Infinity;
    for (const p of e.p) low = Math.max(low, p.y + p.r);
    const k = clamp(1 - (y - low) / 420, 0.15, 1);
    ctx.globalAlpha = 0.45 * k;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(hip.x, y, 30 * e.s * (0.5 + k * 0.5), 5 * e.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawElon(ctx: CanvasRenderingContext2D, e: Elon) {
    const p = e.p;
    const d = e.d;
    const held = this.grab?.e === e;
    const limb = (a: number, b: number, c?: number) => {
      ctx.moveTo(p[a].x, p[a].y);
      ctx.lineTo(p[b].x, p[b].y);
      if (c !== undefined) ctx.lineTo(p[c].x, p[c].y);
    };
    const body = () => {
      ctx.beginPath();
      limb(HEAD, NECK, HIP);
      limb(NECK, LELB, LHAND);
      limb(NECK, RELB, RHAND);
      limb(HIP, LKNEE, LFOOT);
      limb(HIP, RKNEE, RFOOT);
      ctx.stroke();
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = held ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.09)";
    ctx.lineWidth = d.line * 3.2;
    body();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = d.line;
    body();

    ctx.fillStyle = "#ffffff";
    for (const j of [LHAND, RHAND]) {
      ctx.beginPath();
      ctx.arc(p[j].x, p[j].y, d.line * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = d.line * 1.1;
    for (const [knee, foot] of [
      [LKNEE, LFOOT],
      [RKNEE, RFOOT],
    ]) {
      const sx = p[foot].x - p[knee].x;
      const sy = p[foot].y - p[knee].y;
      const len = Math.hypot(sx, sy) || 1;
      const side = e.procedural || e.mode === "getup" ? e.dir : 1;
      ctx.beginPath();
      ctx.moveTo(p[foot].x, p[foot].y);
      ctx.lineTo(p[foot].x + (-sy / len) * 7 * e.s * side, p[foot].y + (sx / len) * 7 * e.s * side);
      ctx.stroke();
    }

    const hx = p[HEAD].x;
    const hy = p[HEAD].y;
    const ang = Math.atan2(hx - p[NECK].x, -(hy - p[NECK].y));
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    const sc = held ? 1.06 : 1;
    if (held) {
      ctx.shadowColor = "rgba(255,255,255,0.7)";
      ctx.shadowBlur = 24;
    }
    if (this.head?.complete && this.head.naturalWidth > 0) {
      ctx.drawImage(this.head, (-d.headW / 2) * sc, -d.headH * 0.56 * sc, d.headW * sc, d.headH * sc);
    } else {
      ctx.fillStyle = "#d9d4cc";
      ctx.beginPath();
      ctx.ellipse(0, -d.headH * 0.06, d.headW / 2, d.headH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawBubble(ctx: CanvasRenderingContext2D, e: Elon) {
    const b = e.bubble;
    if (!b) return;
    const head = e.p[HEAD];
    const pop = easeOutBack(Math.min(1, b.t / 0.22));
    const alpha = Math.min(1, b.t / 0.12, (b.dur - b.t) / 0.25);
    if (alpha <= 0) return;
    const size = Math.round(clamp(12 * e.s, 11, 13));
    ctx.font = `600 ${size}px ${this.font}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1.2px";
    const lines = wrap(ctx, b.text.toUpperCase(), 200);
    const lh = size * 1.35;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
    const hgt = lines.length * lh + 16;
    const ax = head.x;
    const ay = head.y - e.d.headH * 0.62;
    const bx = clamp(ax - w / 2, 8, this.W - w - 8);
    const by = Math.max(8, ay - hgt - 12);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ax, ay);
    ctx.scale(pop, pop);
    ctx.translate(-ax, -ay);
    ctx.fillStyle = b.hot ? "#000000" : "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 16;
    roundRect(ctx, bx, by, w, hgt, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (b.hot) ctx.stroke();
    const tx = clamp(ax, bx + 12, bx + w - 12);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(tx - 1, by + hgt);
    ctx.lineTo(tx + 1, by + hgt);
    ctx.lineTo(tx + 1, by + hgt + 9);
    ctx.lineTo(tx - 1, by + hgt + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = b.hot ? "#ffffff" : "#000000";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 9 + i * lh));
    ctx.restore();
  }
}

function segDist(x: number, y: number, a: Vec, b: Vec) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
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

export function buildTitleProfile(container: HTMLElement, W: number, H: number): Float32Array {
  const profile = new Float32Array(Math.ceil(W)).fill(Infinity);
  const els = container.querySelectorAll<HTMLElement>("[data-mask]");
  if (!els.length || W < 1 || H < 1) return profile;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(W);
  canvas.height = Math.ceil(H);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return profile;
  const box = container.getBoundingClientRect();
  let top = Infinity;
  let bottom = 0;
  ctx.fillStyle = "#000";
  for (const el of els) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const text = el.textContent ?? "";
    const m = ctx.measureText(text);
    const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    const baseline = r.top - box.top + (r.height - content) / 2 + m.fontBoundingBoxAscent;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, r.left - box.left + parseFloat(cs.paddingLeft || "0"), baseline);
    top = Math.min(top, r.top - box.top);
    bottom = Math.max(bottom, r.bottom - box.top);
  }
  const y0 = Math.max(0, Math.floor(top));
  const y1 = Math.min(canvas.height, Math.ceil(bottom));
  if (y1 <= y0) return profile;
  const data = ctx.getImageData(0, y0, canvas.width, y1 - y0).data;
  const w = canvas.width;
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < y1 - y0; y++) {
      if (data[(y * w + x) * 4 + 3] > 140) {
        profile[x] = y0 + y;
        break;
      }
    }
  }
  return profile;
}
