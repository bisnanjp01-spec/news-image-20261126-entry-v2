// news-image-20261126-entry-v2 — main.ts
// Generates a dense 1024x1024 newspaper front page ("THE WORLD IN ONE DAY")
// summing up Thursday 26 November 2026 in 50 real stories, as a PNG.
// Pure Node 22 standard library only (node:fs, node:path, node:zlib).
// No dependencies, no network, no randomness, no timestamps:
// the output is byte-identical on every run.
//
// Run:  MAKEFUN_OUTPUT_DIR=/output node main.ts
// Output: $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png)

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// Resolve the script location from process.argv[1] (never __dirname under ESM).
const SCRIPT_DIR = path.dirname(path.resolve(process.argv[1] ?? "main.ts"));

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase). Each glyph is 7 rows of 5 bits, MSB = left.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  "%": [0b11001, 0b11010, 0b00010, 0b00100, 0b01000, 0b01011, 0b10011],
  $: [0b00100, 0b01111, 0b10100, 0b01110, 0b00101, 0b11110, 0b00100],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ";": [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  "+": [0, 0b00100, 0b00100, 0b01110, 0b00100, 0b00100, 0],
  "=": [0, 0, 0b01110, 0, 0b01110, 0, 0],
  '"': [0b01010, 0b01010, 0b01010, 0, 0, 0, 0],
  "*": [0, 0b00100, 0b10101, 0b01110, 0b10101, 0b00100, 0],
};

function normalizeChar(ch: string): string {
  const c = ch.toUpperCase();
  if (c === "€") return "E";
  if (c === "—" || c === "–") return "-";
  if (c === "·") return ".";
  if (c === "’" || c === "‘") return "'";
  if (c === "“" || c === "”") return '"';
  if (c === "…") return ".";
  return c;
}

function glyphFor(ch: string): number[] {
  return FONT[normalizeChar(ch)] ?? FONT["?"];
}

// ---------------------------------------------------------------------------
// RGB canvas + drawing primitives (no anti-aliasing: hard pixel edges only)
// ---------------------------------------------------------------------------
const rgb = Buffer.alloc(W * H * 3, 255); // white background

function setPixel(x: number, y: number, r: number, g: number, b: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  rgb[i] = r;
  rgb[i + 1] = g;
  rgb[i + 2] = b;
}

function fillRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  g: number,
  b: number,
): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setPixel(xx, yy, r, g, b);
    }
  }
}

function drawChar(
  x: number,
  y: number,
  ch: string,
  scale: number,
  r: number,
  g: number,
  b: number,
): void {
  const glyph = glyphFor(ch);
  for (let row = 0; row < 7; row++) {
    const bits = glyph[row];
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) {
        fillRect(x + col * scale, y + row * scale, scale, scale, r, g, b);
      }
    }
  }
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale; // 5px glyph + 1px gap, no trailing gap
}

function drawText(
  x: number,
  y: number,
  text: string,
  scale: number,
  r: number,
  g: number,
  b: number,
): void {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    drawChar(x + i * 6 * scale, y, upper[i], scale, r, g, b);
  }
}

function drawTextCentered(
  cx: number,
  y: number,
  text: string,
  scale: number,
  r: number,
  g: number,
  b: number,
): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, r, g, b);
}

// Word-wrap into lines of at most maxWidth pixels at the given scale.
function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxWidth / (6 * scale)));
  // Split any single word longer than a line so it can never overflow the
  // panel (no current headline or caption contains such a word, so this
  // does not change the rendered output for the 50 stories in this entry).
  const words = text.split(" ").flatMap((w) => {
    if (w.length <= maxChars) return [w];
    const parts: string[] = [];
    for (let i = 0; i < w.length; i += maxChars) parts.push(w.slice(i, i + maxChars));
    return parts;
  });
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (cur === "") {
      cur = word;
    } else if (cur.length + 1 + word.length <= maxChars) {
      cur += " " + word;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: signature + IHDR + IDAT (zlib deflate) + IEND, own CRC32
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 3 + 1);
    raw[rowStart] = 0; // filter: None
    rgb.copy(raw, rowStart + 1, y * W * 3, (y + 1) * W * 3);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The 50 stories — real news reported 25-26 November 2026.
// 1 lead + 3 trio + 46 in the region grid = 50.
// ---------------------------------------------------------------------------
interface Story {
  headline: string;
  caption: string;
}

const LEAD: Story = {
  headline: "TARIFFS FOR FOURTEEN NATIONS",
  caption:
    "Washington proposes new tariffs on 14 trading partners to fight excess factory capacity; China faces the highest rates.",
};

const TRIO: Story[] = [
  {
    headline: "KIM ORDERS MORE NUKES",
    caption:
      "North Korea's leader tours nuclear sites and calls for wider tactical nuclear deployment.",
  },
  {
    headline: "HUAWEI GUILTY ON TEN COUNTS",
    caption:
      "New York jury convicts Huawei of stealing US trade secrets and violating Iran sanctions.",
  },
  {
    headline: "RIYADH TOWER HIT AGAIN",
    caption:
      "Houthi drone strikes the Saudi capital's tallest tower a second time in a week, wounding 11.",
  },
];

interface Region {
  label: string;
  stories: Story[];
}

const REGIONS: Region[] = [
  {
    label: "NORTH AMERICA",
    stories: [
      {
        headline: "NASDAQ SLIDES 4%",
        caption:
          "AI sell-off and tariff proposals rattle Wall Street; Asia's KOSPI plunges 6%.",
      },
      {
        headline: "THANKSGIVING STORM",
        caption:
          "East Coast storm brings rain and strong winds for Thanksgiving; Trump pardons turkeys Freedom and Feathers.",
      },
      {
        headline: "FAMINE MONITOR GOES DARK",
        caption:
          "US famine monitor FEWS NET halts reporting as funding shortfall hits staff.",
      },
    ],
  },
  {
    label: "SOUTH AMERICA",
    stories: [
      {
        headline: "CARTAGENA SIEGE ENDS",
        caption:
          "Gunmen seize 25 hostages at a supermarket after a failed robbery; police storm the store and free dozens.",
      },
      {
        headline: "VENEZUELA SIGNS WITH SHELL",
        caption:
          "Caracas signs a $400M service order with Shell to boost crude output.",
      },
      {
        headline: "MADURO TURNS 64 BEHIND BARS",
        caption:
          "The jailed ex-president's son leads birthday celebrations in Caracas.",
      },
      {
        headline: "POPE'S TOUR ENDS",
        caption:
          "Pope Leo XIV wraps up a 12-day apostolic tour of Uruguay, Argentina and Peru.",
      },
      {
        headline: "11 DAYS IN THE AMAZON",
        caption:
          "Elderly man with Alzheimer's rescued after 11 days lost in the jungle.",
      },
    ],
  },
  {
    label: "EUROPE",
    stories: [
      {
        headline: "MERZ BACKS UKRAINE AID",
        caption:
          "Germany's chancellor defends aid for Kyiv, warning Russia is a growing threat to Europe.",
      },
      {
        headline: "EUROSTAR STRIKE CHAOS",
        caption:
          "Surprise drivers' strike disrupts Paris-London trains.",
      },
      {
        headline: "GERMANY STALLS AT 0.1%",
        caption:
          "Berlin slashes third-quarter growth to 0.1% as exports and factory investment stall.",
      },
      {
        headline: "NBA'S EUR 10BN EUROPE PLAN",
        caption:
          "The NBA unveils a EUR 10 billion plan for arenas across Europe.",
      },
      {
        headline: "RECORD MIGRANT ARRIVALS",
        caption:
          "Spain's Canary Islands see a record single-day arrival of over 2,100 migrants.",
      },
      {
        headline: "LISBON MARCHES ON HOUSING",
        caption:
          "Thousands march in Lisbon demanding relief from the housing crisis.",
      },
      {
        headline: "LASER DOWNS DRONE",
        caption:
          "Ukraine's laser downs a Russian jet-powered drone in a world first.",
      },
    ],
  },
  {
    label: "AFRICA",
    stories: [
      {
        headline: "SUDAN STRIKES KILL 19",
        caption:
          "Drone strikes in Sudan's Blue Nile state kill 19 civilians.",
      },
      {
        headline: "EGYPT FIRE KILLS 30",
        caption:
          "At least 30 killed and 15 injured as a vehicle carrying petroleum products catches fire.",
      },
      {
        headline: "RAMAPHOSA WINS IN COURT",
        caption:
          "South African court victory for the president in the cash-theft investigation.",
      },
      {
        headline: "TINUBU VOWS PEACE",
        caption:
          "Nigeria's president pledges to bring peace to the rebellion-hit border region.",
      },
      {
        headline: "SAUDI KIDNAPPED IN NIGER",
        caption:
          "Saudi national seized by suspected Islamic State militants and held hostage.",
      },
    ],
  },
  {
    label: "MIDDLE EAST",
    stories: [
      {
        headline: "IS ATTACK IN HASAKA",
        caption:
          "Islamic State attack kills two Syrian security personnel in the northeast.",
      },
      {
        headline: "GAZA STRIKE KILLS HAMAS OFFICIAL",
        caption:
          "Israeli airstrike kills a senior Hamas official and his family; winter rains threaten 1,000 shelter sites.",
      },
      {
        headline: "NETANYAHU: TRIAL MUST END",
        caption:
          "The prime minister says his corruption trial 'must end' as the court suggests dropping the case.",
      },
      {
        headline: "DRONE TARGETS BAHRAIN RADAR",
        caption:
          "Iran targets a US radar system in Bahrain with a drone attack.",
      },
      {
        headline: "IRAQ TAKES KURDISH OIL",
        caption:
          "Iraq's top court rules Baghdad can take over Kurdish borders and oil fields.",
      },
    ],
  },
  {
    label: "SOUTH ASIA",
    stories: [
      {
        headline: "BANGLADESH WAGE RISE 36%",
        caption:
          "Dhaka announces a 36% wage increase for garment workers.",
      },
      {
        headline: "NEPAL QUAKE 5.3",
        caption:
          "5.3-magnitude earthquake strikes Nepal's Koshi province.",
      },
      {
        headline: "HIMALAYAN FLOOD HUNT",
        caption:
          "Indian Army searches for scores missing after a deadly Himalayan flood.",
      },
      {
        headline: "REVANNA GETS LIFE",
        caption:
          "Former Indian lawmaker Prajwal Revanna sentenced to life for rape.",
      },
    ],
  },
  {
    label: "EAST ASIA",
    stories: [
      {
        headline: "PYONGYANG EXPELS SWISS ENVOY",
        caption:
          "North Korea boots Switzerland's ambassador in retaliation for sanctions.",
      },
      {
        headline: "FIRST FOREIGNER ON TIANGONG",
        caption:
          "Pakistani astronaut becomes the first foreigner aboard China's space station.",
      },
      {
        headline: "JAPAN–SINGAPORE DRILLS",
        caption:
          "Tokyo and Singapore plan regular naval drills after their first joint exercise.",
      },
      {
        headline: "SEOUL SCRAMBLES JETS",
        caption:
          "South Korea scrambles jets as Russian aircraft enter its defence zone.",
      },
    ],
  },
  {
    label: "SOUTHEAST ASIA",
    stories: [
      {
        headline: "GOLD MINE FLOOD KILLS NINE",
        caption:
          "Flooding at an Indonesian gold mine leaves nine miners dead.",
      },
      {
        headline: "MALAYSIA SUES GOOGLE",
        caption:
          "Kuala Lumpur sues Google for $146M over YouTube content.",
      },
      {
        headline: "THAI–CAMBODIA TRUCE HOLDS",
        caption:
          "Fighting on the Thai–Cambodia border on hold following a truce.",
      },
      {
        headline: "SOFTBANK BETS $2BN ON INTEL",
        caption:
          "Japan's SoftBank to invest $2 billion in Intel.",
      },
      {
        headline: "SINGAPORE GDP JUMPS 6.1%",
        caption:
          "Singapore's economy grows 6.1% in Q3 as exports boom.",
      },
    ],
  },
  {
    label: "OCEANIA",
    stories: [
      {
        headline: "AUSTRALIA'S BIG-TECH LAW",
        caption:
          "Canberra passes the Digital Duty of Care Act to control Big Tech.",
      },
      {
        headline: "SOLOMONS SIGN CANBERRA PACT",
        caption:
          "Solomon Islands and Australia sign a sweeping treaty; AU$740M over 10 years, no foreign base.",
      },
      {
        headline: "INFLATION HITS 4.9%",
        caption:
          "Australian inflation jumps to 4.9%; a bushfire burns on Tasmania's Flinders Island.",
      },
      {
        headline: "RNZ FIGHTS CYBER BREACH",
        caption:
          "New Zealand's public broadcaster manages an attempted cyber breach.",
      },
      {
        headline: "AUSTRALIA SAYS SORRY",
        caption:
          "Canberra formally apologises in Parliament to LGBTQ military veterans.",
      },
    ],
  },
  {
    label: "CENTRAL ASIA",
    stories: [
      {
        headline: "CENTRAL ASIA'S POWER MARKET",
        caption:
          "Four states push ahead with a regional spot electricity market.",
      },
      {
        headline: "KAZAKHSTAN'S $1BN GREEN PLAN",
        caption:
          "Astana launches a Climate Investment Platform at COP31 with up to $1B in EBRD backing.",
      },
      {
        headline: "KYRGYZSTAN'S $10M PLEDGE",
        caption:
          "Bishkek pledges $10 million to the Issyk-Kul trust fund.",
      },
    ],
  },
];

const TICKER =
  "SpaceX wins approval for orbital data centres · Sanofi strikes $41B deal for Insmed · Microsoft declares 'Code Red' after historic outage · Anthropic shares tumble below IPO price · US consumer confidence hits near two-year high · Shein pays $100M to settle US claims · Qatar F1 Grand Prix goes ahead despite war.";

// ---------------------------------------------------------------------------
// Layout — bands (y ranges): masthead 0-66, dateline 66-90, lead 92-204,
// trio 212-320, grid title 328-346, grid 350-952, footer 956-1024.
// ---------------------------------------------------------------------------
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const PANEL_BG: [number, number, number] = [242, 242, 242];
const ALT_BG: [number, number, number] = [245, 245, 245];

function drawBorder(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, 2, ...BLACK);
  fillRect(x, y + h - 2, w, 2, ...BLACK);
  fillRect(x, y, 2, h, ...BLACK);
  fillRect(x + w - 2, y, 2, h, ...BLACK);
}

function render(): void {
  // Masthead: black bar, white title.
  fillRect(0, 0, W, 66, ...BLACK);
  drawTextCentered(512, 15, "THE WORLD IN ONE DAY", 5, ...WHITE);

  // Dateline.
  drawTextCentered(512, 71, "THURSDAY 26 NOVEMBER 2026", 2, ...BLACK);
  fillRect(0, 90, W, 2, ...BLACK);

  // Lead story panel.
  fillRect(8, 92, 1008, 112, ...PANEL_BG);
  drawBorder(8, 92, 1008, 112);
  drawTextCentered(512, 100, LEAD.headline, 4, ...BLACK);
  const leadLines = wrapText(LEAD.caption, 2, 960);
  leadLines.forEach((line, i) => {
    drawTextCentered(512, 140 + i * 17, line, 2, ...BLACK);
  });

  // Trio row: three panels.
  const trioX = [8, 348, 688];
  const trioW = 328;
  TRIO.forEach((story, idx) => {
    const x = trioX[idx];
    const y = 212;
    fillRect(x, y, trioW, 108, ...PANEL_BG);
    drawBorder(x, y, trioW, 108);
    const headLines = wrapText(story.headline, 2, trioW - 16);
    headLines.forEach((line, i) => {
      drawTextCentered(x + trioW / 2, y + 8 + i * 16, line, 2, ...BLACK);
    });
    const capTop = y + 8 + headLines.length * 16 + 6;
    const capLines = wrapText(story.caption, 1, trioW - 16);
    capLines.forEach((line, i) => {
      drawText(x + 8, capTop + i * 10, line, 1, ...BLACK);
    });
  });

  // Grid title bar.
  fillRect(8, 328, 1008, 18, ...BLACK);
  drawTextCentered(512, 332, "AROUND THE WORLD - 46 MORE STORIES", 1, ...WHITE);

  // Region grid: 3 columns, flowing top-to-bottom, left-to-right.
  const GRID_TOP = 350;
  const GRID_BOTTOM = 952;
  const COL_W = 328;
  const colX = (c: number): number => 8 + c * 336;
  let col = 0;
  let cy = GRID_TOP;
  let storyIndex = 0;

  const drawRegionLabel = (label: string): void => {
    const x = colX(col);
    fillRect(x, cy, COL_W, 14, ...BLACK);
    drawText(x + 6, cy + 3, label, 1, ...WHITE);
    cy += 16;
  };

  for (const region of REGIONS) {
    if (GRID_BOTTOM - cy < 16 + 40 && col < 2) {
      col++;
      cy = GRID_TOP;
    }
    drawRegionLabel(region.label);
    for (const story of region.stories) {
      const headLines = wrapText(story.headline, 1, COL_W - 12);
      const capLines = wrapText(story.caption, 1, COL_W - 12);
      const blockH = 2 + headLines.length * 8 + 1 + capLines.length * 8 + 3;
      if (blockH > GRID_BOTTOM - cy) {
        if (col < 2) {
          col++;
          cy = GRID_TOP;
          drawRegionLabel(region.label);
        } else {
          // Never silently truncate a story: fail loudly instead.
          throw new Error(`grid overflow at story: ${story.headline}`);
        }
      }
      const x = colX(col);
      if (storyIndex % 2 === 0) fillRect(x, cy, COL_W, blockH, ...ALT_BG);
      headLines.forEach((line, i) => {
        drawText(x + 6, cy + 2 + i * 8, line, 1, ...BLACK);
      });
      const capY = cy + 2 + headLines.length * 8 + 1;
      capLines.forEach((line, i) => {
        drawText(x + 6, capY + i * 8, line, 1, ...BLACK);
      });
      fillRect(x, cy + blockH - 1, COL_W, 1, 200, 200, 200);
      cy += blockH;
      storyIndex++;
    }
  }

  // Footer ticker strip: black bar, white wrapped headlines.
  fillRect(0, 956, W, 68, ...BLACK);
  const tickLines = wrapText(TICKER, 1, 1000);
  const tickTop = 956 + Math.floor((68 - tickLines.length * 10) / 2);
  tickLines.forEach((line, i) => {
    drawTextCentered(512, tickTop + i * 10, line, 1, ...WHITE);
  });
}

function main(): void {
  render();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const outPath = path.join(outDir, "entry.png");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, png);
  console.log(`script dir: ${SCRIPT_DIR}`);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}

main();
