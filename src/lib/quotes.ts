export const CHATTER = [
  "Concerning.",
  "Looking into it.",
  "!!",
  "Interesting.",
  "Wow",
  "True.",
  "Exactly.",
  "Much to consider.",
  "Let that sink in.",
  "Occupy Mars.",
  "First principles!",
  "Next year. For sure.",
  "Two weeks, max.",
  "Funding secured.",
  "Ludicrous mode.",
  "Huge if true.",
  "The most entertaining outcome is the most likely.",
  "Who controls the memes controls the universe.",
  "I'm not a robot. Probably.",
  "We need a bigger rocket.",
  "This is extremely hardcore.",
  "Physics is the law. Everything else is a recommendation.",
];

export const GRABBED = [
  "Put me down!",
  "Wheee!",
  "Not the face!",
  "Unhand me!",
  "Ludicrous speed!",
  "Hold on, I'm posting.",
  "Gravity is a suggestion.",
  "This is fine.",
];

export const LANDED = [
  "I meant to do that.",
  "Nailed the landing.",
  "Excellent data.",
  "Booster caught.",
  "Still better than Mars.",
  "Concerning.",
];

export const RUD = [
  "Rapid unscheduled disassembly!",
  "RUD!",
  "That was a test.",
  "Excellent data!",
];

export const BONKED = ["Hey!", "Rude.", "Bowling? Really?", "Concerning."];

export const WAVE = ["Hi!", "Hello, humans.", "o/"];

export const DANCE = ["Ludicrous mode 🕺", "Dance mode: ON", "♪ ♫ ♪"];

export const TICKER = [
  "Concerning.",
  "Looking into it.",
  "The most entertaining outcome is the most likely.",
  "Next year. For sure this time.",
  "Occupy Mars.",
  "Funding secured.",
  "Let that sink in.",
  "!!",
  "Physics is the law. Everything else is a recommendation.",
  "Who controls the memes controls the universe.",
];

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
