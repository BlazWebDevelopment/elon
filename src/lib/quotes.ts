export const CHATTER = [
  "Nobody runs faster than me. Nobody.",
  "Beautiful lawn. The best lawn.",
  "Many people are saying this.",
  "Believe me.",
  "I know words. I have the best words.",
  "We're gonna win so much.",
  "Bing. Bing. Bong.",
  "Tremendous.",
  "Look at the size of this crowd!",
  "Perfect lawn. Perfect.",
  "Who ordered the hamberders?",
  "Covfefe.",
  "I'm very athletic. Very.",
  "This is a big, beautiful run.",
];

export const CATCH = {
  burger: ["HAMBERDER!", "TREMENDOUS!", "YUGE!", "DELICIOUS!", "BEAUTIFUL!"],
  coke: ["DIET COKE!", "THE BUTTON WORKS!", "REFRESHING!"],
  covfefe: ["COVFEFE!!", "NOBODY KNOWS WHAT IT MEANS!"],
  sharpie: ["BIGLY MODE!", "EXECUTIVE POWER!", "SIGNED!"],
} as const;

export const HIT = {
  news: ["FAKE NEWS!", "SAD!", "WRONG!", "VERY UNFAIR!"],
  windmill: ["NOT THE WINDMILLS!", "SO LOUD!", "TERRIBLE WINDMILL!"],
} as const;

export const COMBO: [number, string][] = [
  [3, "WINNING!"],
  [5, "SO MUCH WINNING!"],
  [8, "TIRED OF WINNING YET?"],
  [12, "NEVER TIRED OF WINNING!"],
  [18, "THE BEST COMBO IN HISTORY!"],
];

export const FIRED_SUB = [
  "The ratings were tremendous though.",
  "Many people are saying you did great.",
  "Not bad. Not the best, but not bad.",
  "Sad! Very sad.",
  "You had a good run. Not as good as mine.",
];

export const TICKER = [
  "BREAKING: Hamberder supply at an all-time high",
  "Diet Coke button pressed 47 times before lunch",
  "South Lawn declared 'the most beautiful lawn, maybe ever'",
  "Sharpie reserves fully stocked",
  "Escalator inspected, found to be 'very classy'",
  "Windmills placed on notice",
  "Covfefe meaning still classified",
  "Ratings: through the roof",
];

export const AGENDA = [
  {
    title: "Secure the Burgers",
    body: "Over 1,000 hamberders ordered. Piled up to the ceiling. Big Macs, Quarter Pounders, the works. No other administration has ever secured burgers like this.",
    stat: "1,000+",
    statLabel: "Hamberders served",
  },
  {
    title: "Grow the Hair",
    body: "Some people said it couldn't be done. It's done. It's real, it's beautiful and it withstands winds of up to 45 miles per hour. Maybe 47.",
    stat: "100%",
    statLabel: "Real (very real)",
  },
  {
    title: "Unleash Diet Coke",
    body: "One button. A red button. You press it and a Diet Coke arrives. The most efficient system in the history of government, maybe the world.",
    stat: "12/day",
    statLabel: "Button presses",
  },
  {
    title: "Defeat the Windmills",
    body: "They're noisy. Very noisy. They ruin the view at the golf course. The birds have been asking for help and we are finally giving it to them.",
    stat: "0",
    statLabel: "Windmills on the lawn",
  },
  {
    title: "Make Escalators Great Again",
    body: "It all started with a golden escalator. Today every escalator is safer, shinier and much more dramatic. People ride them with tears in their eyes.",
    stat: "1",
    statLabel: "Legendary ride",
  },
];

export type Action = { kind: string; title: string; date: string; order: string };

export const ACTIONS: Action[] = [
  {
    kind: "Executive Orders",
    title: "Declaring the Diet Coke Button a Critical National Resource",
    date: "October 19, 2026",
    order:
      "The Diet Coke button on the Resolute Desk is hereby a Critical National Resource. It shall be pressed often, and with great confidence.",
  },
  {
    kind: "Proclamations",
    title: "National Covfefe Day, 2026",
    date: "October 17, 2026",
    order:
      "Every American shall observe National Covfefe Day. Nobody needs to know what it means. Everybody knows what it means.",
  },
  {
    kind: "Executive Orders",
    title: "Making Escalators Great Again",
    date: "October 14, 2026",
    order:
      "All escalators must be golden, very classy, and ridden slowly while waving to an enormous crowd of beautiful people.",
  },
  {
    kind: "Briefings & Statements",
    title: "Statement on the Hamberder Situation",
    date: "October 10, 2026",
    order:
      "The hamberders will be piled up to the ceiling. Big beautiful piles. Anybody saying otherwise is fake news.",
  },
  {
    kind: "Presidential Memoranda",
    title: "Memorandum on the Official Sharpie Weather Map",
    date: "October 6, 2026",
    order:
      "The National Weather Map shall be updated by Sharpie whenever necessary. The forecast is whatever we draw, and it is beautiful.",
  },
  {
    kind: "Executive Orders",
    title: "Requiring All Steaks to Be Served Well-Done, With Ketchup",
    date: "October 2, 2026",
    order:
      "Every steak in the United States shall be cooked well-done and served with a generous amount of ketchup. The chefs will be thrilled.",
  },
];

export const RANDOM_ORDERS = [
  { title: "Making Weekends Great Again", order: "Mondays are hereby moved to Saturday. Saturdays shall be twice as long." },
  { title: "On the Bonus Cheeseburger", order: "Every cheeseburger shall come with a second, bonus cheeseburger. Free. Beautiful." },
  { title: "Renaming the Moon", order: "The Moon is renamed 'The Trump Moon'. It is doing very well, much better than before." },
  { title: "On Golf Score Fairness", order: "All golf scores shall be rounded down. Way down. Especially mine." },
  { title: "Escalators for All", order: "Every American is entitled to one (1) golden escalator, to be ridden slowly while waving." },
  { title: "Regulating the Windmills", order: "Windmills must apply for a permit before spinning. Permits will not be granted." },
  { title: "On Tie Length", order: "All ties shall be at least 20% longer, by order of the President. Very long. Very strong." },
  { title: "Protecting the Word Tremendous", order: "The word 'tremendous' shall be used at least three times per sentence. Tremendous. Tremendous." },
  { title: "Beautiful Lawns Act", order: "Every lawn in America shall be mowed in a beautiful diagonal pattern, like the South Lawn." },
];

export const SIGNED_QUIPS = [
  "Beautiful. Maybe the best order ever signed.",
  "Look at that signature. Like a skyline.",
  "Signed. Very legal. Very cool.",
  "Nobody signs like me. Nobody.",
  "Tremendous order. Frame it.",
];

export const PRESS_RULES: [RegExp, string[]][] = [
  [/burger|hamberder|food|hungry|eat|mcdonald|fries|steak/i, [
    "Hamberders. Big beautiful hamberders. We ordered 1,000. Piled up to the ceiling.",
    "Well-done steak, ketchup. That's elegance. Ask anybody.",
  ]],
  [/coke|soda|drink|thirsty|button/i, [
    "I press the button. The red button. A Diet Coke arrives. Beautiful system.",
    "Diet Coke. Twelve a day. Maybe more. My doctors say I'm the healthiest person ever.",
  ]],
  [/hair|tan|orange|look|handsome/i, [
    "The hair is real. Very real. Many people say it's the best hair, maybe in history.",
    "I look good. Very good. They're saying better than ever.",
  ]],
  [/news|media|cnn|journalist|reporter|press/i, [
    "Fake news! Very unfair. Next question.",
    "You're a terrible reporter. Terrible. Great question though.",
  ]],
  [/golf|game|sport|play|run/i, [
    "I'm a very good golfer. Club champion. Many clubs. My clubs.",
    "Nobody plays better than me. Have you tried my lawn game? Tremendous.",
  ]],
  [/money|rich|economy|stock|crypto|bitcoin|price|deal/i, [
    "The economy? Best ever. Numbers like nobody's ever seen.",
    "We're making deals. The best deals. Some deals so good they don't know they made them.",
  ]],
  [/covfefe/i, ["Everybody knows what covfefe means. Figure it out.", "Covfefe. Classified. Very classified."]],
  [/windmill|wind|energy|green/i, ["The windmills. Noisy. Very noisy. The birds hate them, believe me."]],
  [/elon|musk|rocket|mars|space/i, [
    "Elon? Smart guy. Rockets. Not as good at rockets as me, but okay.",
    "Space Force. My idea. Everybody loves it.",
  ]],
  [/fired|apprentice|job|work/i, ["You're fired! I've always wanted to say that again.", "Nobody works harder than me. I've been told that."]],
  [/smart|iq|genius|test|brain/i, [
    "Very stable genius. They gave me a test. I aced it.",
    "Person. Woman. Man. Camera. TV. Aced it.",
  ]],
  [/when|how long|soon|timeline/i, ["Two weeks. We'll know in two weeks.", "Very soon. Sooner than anyone thought possible."]],
  [/why/i, ["Because it's tremendous. Simple as that.", "Because I'm the only one who could do it. Believe me."]],
  [/should i|can i|will i|is it|am i|do i|are you|would you/i, [
    "Yes. Absolutely. Believe me.",
    "Wrong!",
    "Many people are asking that. Great question. Next.",
  ]],
];

export const PRESS_FALLBACK = [
  "Tremendous question. Tremendous. Next.",
  "Nobody knows more about that than me. Nobody.",
  "We're looking into it. Very strongly.",
  "Believe me, it's going to be huge.",
  "Many people are saying it. Very smart people.",
  "Sad! Next question.",
  "That's a nasty question. I love it.",
];

export const PRESS_THINKING = [
  "Checking with very smart people…",
  "Consulting the best words…",
  "Pressing the Diet Coke button…",
  "Asking many people (they're saying)…",
  "Drafting a post at 3am…",
];

export const PRESS_SUGGESTIONS = [
  "What's for lunch?",
  "Is the hair real?",
  "How's the economy?",
  "What does covfefe mean?",
  "Thoughts on windmills?",
];

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
