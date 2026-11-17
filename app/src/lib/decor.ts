/*
 * 빙고판 꾸미기. 기본 스티커는 이 서비스용으로 직접 그린 SVG라 저작권 걱정이 없다.
 * 운영진이 올린 스티커는 "u:<id>" 로 구분한다. 꾸미기는 점수와 무관하다.
 */

/** 직접 만든 글자 스티커는 id "t:text" 에 글자(t)·모양(s)·색(c)을 함께 담는다 */
export type DecorItem = { id: string; x: number; y: number; r: number; k: number; t?: string; s?: TextStyle; c?: string };
/** cells: 칸 순서(0..24)대로 칸 색 키 ("" = 기본) */
export type Decor = { theme: string; items: DecorItem[]; cells: string[] };
export type StickerSrc = { id: string; name: string; src: string; cat?: string };

/** 카톡 이모티콘처럼 탭으로 나눈 스티커 묶음 */
export const STICKER_CATS = ["캐릭터", "자막", "알파벳", "동물", "운영진"] as const;
export const TEXT_STYLES = [
  { key: "plain", label: "자막" },
  { key: "burst", label: "뾰족" },
  { key: "cloud", label: "구름" },
  { key: "box", label: "상자" },
  { key: "blocks", label: "블록" },
  { key: "collage", label: "콜라주" },
] as const;
export type TextStyle = (typeof TEXT_STYLES)[number]["key"];
export const TEXT_MAX = 14;

export const MAX_STICKERS = 30;

/** 판 테두리 색 */
export const THEMES: { key: string; label: string; color: string }[] = [
  { key: "", label: "기본", color: "#ffffff" },
  { key: "sky", label: "하늘", color: "#dcefff" },
  { key: "lemon", label: "레몬", color: "#fff4c9" },
  { key: "peach", label: "복숭아", color: "#ffe4d6" },
  { key: "lilac", label: "라일락", color: "#ece4ff" },
  { key: "mint", label: "민트", color: "#ddf4e7" },
  { key: "rose", label: "로즈", color: "#fde7ee" },
  { key: "cocoa", label: "코코아", color: "#eadccd" },
];
/** 칸 하나하나에 칠할 수 있는 잔잔한 색 */
export const CELL_COLORS: { key: string; label: string; color: string }[] = [
  { key: "cream", label: "크림", color: "#fff6df" },
  { key: "butter", label: "버터", color: "#fff0b3" },
  { key: "peach", label: "복숭아", color: "#ffe2d1" },
  { key: "rose", label: "로즈", color: "#fcdde6" },
  { key: "lilac", label: "라일락", color: "#e9e1ff" },
  { key: "sky", label: "하늘", color: "#dcecff" },
  { key: "mint", label: "민트", color: "#d9f2e4" },
  { key: "sage", label: "세이지", color: "#e3ead9" },
  { key: "cocoa", label: "코코아", color: "#eadccd" },
  { key: "cloud", label: "구름", color: "#eceff1" },
];
export const isHex = (k: string) => /^#[0-9a-f]{6}$/i.test(k);
/** 칸 색: 팔레트 키나 직접 고른 #rrggbb */
export const cellColor = (k: string) => (isHex(k) ? k : CELL_COLORS.find((c) => c.key === k)?.color);

export const themeColor = (k: string) => (isHex(k) ? k : (THEMES.find((t) => t.key === k)?.color ?? "#ffffff"));

const O = 'stroke="#3a2f2a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const face = (x: number, y: number) =>
  `<circle cx="${x - 7}" cy="${y}" r="2.6" fill="#3a2f2a"/><circle cx="${x + 7}" cy="${y}" r="2.6" fill="#3a2f2a"/><path d="M${x - 3} ${y + 5}q3 3 6 0" fill="none" ${O}/><ellipse cx="${x - 13}" cy="${y + 5}" rx="3.5" ry="2" fill="#f7a8b8"/><ellipse cx="${x + 13}" cy="${y + 5}" rx="3.5" ry="2" fill="#f7a8b8"/>`;

/** 예능 자막 느낌의 글자 스티커 (직접 만든 문구·디자인) */
const CAPTIONS: [string, string, string][] = [
  ["cap-daebak", "대박", "#ff7a59"],
  ["cap-legend", "레전드", "#7a5cff"],
  ["cap-injeong", "인정?", "#2f9e6a"],
  ["cap-real", "실화냐", "#e0457b"],
  ["cap-gogo", "가즈아", "#ff9f1c"],
  ["cap-kkk", "ㅋㅋㅋ", "#3a86ff"],
  ["cap-team", "역시 우리 팀", "#14866d"],
  ["cap-done", "미션 성공", "#e85d75"],
  ["cap-wow", "와...", "#6c757d"],
  ["cap-best", "팀워크 최고", "#f08c00"],
];
function caption(text: string, fill: string, i: number) {
  const size = text.length > 4 ? 15 : 22;
  return `<text x="50" y="58" font-size="${size}" font-weight="900" text-anchor="middle" font-family="sans-serif" transform="rotate(${i % 2 ? 6 : -6} 50 50)" fill="${fill}" stroke="#fff" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${text}</text>`;
}

/*
 * 예능 자막 느낌 스티커 2탄. 문구만 쓰고 모양은 직접 그린다 (방송 화면·남의 스티커 이미지는 쓰지 않는다).
 * 모양: burst(뾰족 말풍선) · cloud(구름 말풍선) · blocks(한 글자씩 색 블록) · box(자막 상자)
 */
type CapStyle = "burst" | "cloud" | "blocks" | "box";
const CAPTIONS2: [string, string, CapStyle, string][] = [
  ["v-nodream", "꿈은\n없고요", "burst", "#d9dde0"],
  ["v-justplay", "그냥\n놀고 싶습니다", "burst", "#d9dde0"],
  ["v-mworae", "뭐래", "cloud", "#1f3c5a"],
  ["v-whythat", "왜저래?", "blocks", ""],
  ["v-limit", "한계임박", "blocks", ""],
  ["v-angry", "울화통", "blocks", ""],
  ["v-brain", "두뇌\n풀가동", "box", "#3a86ff"],
  ["v-nocare", "관심 없어", "cloud", "#3d3d3d"],
  ["v-gulp", "꿀꺽", "burst", "#ffe066"],
  ["v-hiing", "히잉", "cloud", "#1f3c5a"],
  ["v-surprise", "깜짝", "cloud", "#2f9e44"],
  ["v-proud", "뿌듯", "cloud", "#2f9e44"],
  ["v-yum", "군침", "cloud", "#e0a800"],
  ["v-tasty", "맛있당~", "cloud", "#f76707"],
  ["v-annoy", "짜증", "cloud", "#2f9e44"],
  ["v-dots", "...", "cloud", "#2f9e44"],
  ["v-lively", "발랄", "cloud", "#2f9e44"],
  ["v-laugh", "헛웃음", "cloud", "#e0a800"],
  ["v-ahem", "크흠...", "cloud", "#2f9e44"],
  ["v-eat", "미친 듯이\n먹자!", "burst", "#ffe066"],
  ["v-crowd", "사람 많아\n사람 많아", "burst", "#ffe066"],
  ["v-memory", "추억 쌓기", "burst", "#ffe066"],
  ["v-sob", "흑흑흑", "box", "#4dabf7"],
  ["v-buy", "이거 사!\nX4", "burst", "#ffd43b"],
  ["v-dontwant", "아유...\n하기 싫어...", "box", "#c92a2a"],
  ["v-noregret", "후회 없이\n놀다 갑시다", "box", "#1c7ed6"],
  ["v-heart", "심장 터질 것\n같아요", "box", "#4dabf7"],
  ["v-frustrate", "속터져", "blocks", ""],
  ["v-fun", "신난다", "blocks", ""],
  ["v-ruined", "망했다", "blocks", ""],
  ["v-letsplay", "놀아보자", "blocks", ""],
];
const BLOCK = ["#ff6b6b", "#ff922b", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc"];
function textLines(text: string, color: string, outline = "#fff") {
  const lines = text.split("\n");
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(26, 70 / Math.max(longest, 2) + 4);
  const top = 50 - ((lines.length - 1) * size * 1.1) / 2 + size * 0.36;
  return lines
    .map(
      (l, i) =>
        `<text x="50" y="${top + i * size * 1.1}" font-size="${size}" font-weight="900" text-anchor="middle" font-family="sans-serif" fill="${color}" stroke="${outline}" stroke-width="${size / 5}" stroke-linejoin="round" paint-order="stroke">${l}</text>`,
    )
    .join("");
}
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svgSrc = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`)}`;

/** 긴 글자는 가운데 띄어쓰기(없으면 가운데)에서 두 줄로 나눈다 */
function wrap(t: string) {
  if (t.length <= 6) return t;
  const mid = t.length / 2;
  const sp = [...t].map((ch, i) => (ch === " " ? i : -1)).filter((i) => i > 0).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
  return sp ? `${t.slice(0, sp)}\n${t.slice(sp + 1)}` : `${t.slice(0, Math.ceil(mid))}\n${t.slice(Math.ceil(mid))}`;
}

/** 사용자가 직접 만든 글자 스티커 그림 */
export function textStickerSrc(text: string, style: TextStyle = "plain", color = "#ff6b6b") {
  const t = esc(text.trim().slice(0, TEXT_MAX) || "?");
  if (style === "plain") return svgSrc(textLines(wrap(t), color, "#fff"));
  if (style === "collage") return svgSrc(collage(t.replace(/\s/g, "").slice(0, 8), color));
  if (style === "blocks") return svgSrc(variety(t.replace(/\s/g, "").slice(0, 6), "blocks", color, 0));
  if (style === "cloud") return svgSrc(variety(wrap(t), "cloud", color, 0));
  if (style === "burst") return svgSrc(variety(wrap(t), "burst", color, 0));
  return svgSrc(variety(wrap(t), "box", color, 0));
}

/*
 * 잡지에서 오려 붙인 듯한 글자 (콜라주). 글자마다 종이 조각 색·글꼴·기울기를 바꾼다.
 * 같은 글자는 늘 같은 모양이 나오도록 글자 코드로 섞는다.
 */
/* 레트로 잡지 색: 머스터드·번트오렌지·벽돌·청록·올리브·네이비·신문지 크림 */
const PAPER = ["#e0a526", "#d9622b", "#b23a2e", "#1f6f6b", "#6d1f2b", "#7b4a2d", "#efe6cf", "#e8d8b0", "#1d1b19", "#c97b7b", "#5c1a24", "#f2ead6", "#6b3e26", "#c9a27e"];
const LIGHT = new Set(["#e0a526", "#efe6cf", "#e8d8b0", "#c97b7b", "#f2ead6", "#c9a27e"]);
const INK_ON_LIGHT = ["#6d1f2b", "#5c1a24", "#1d1b19", "#6b3e26", "#b23a2e", "#1f6f6b"];
const INK_ON_DARK = ["#efe6cf", "#e0a526", "#f2ead6", "#f0b9a8"];
const FONTS = [
  "Rockwell,'American Typewriter',Georgia,serif",
  "'Bodoni 72',Didot,'Times New Roman',serif",
  "'Cooper Black','Arial Rounded MT Bold',Georgia,serif",
  "Impact,'Arial Black',sans-serif",
  "'American Typewriter','Courier New',monospace",
  "Georgia,serif",
];
const HALFTONE = `<pattern id="ht" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r=".7" fill="#000" fill-opacity=".16"/></pattern>`;
function scrap(ch: string, cx: number, cy: number, size: number, seed: number, accent?: string) {
  const h = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const quad = (r: number, k: number) =>
    [
      [cx - r, cy - r],
      [cx + r, cy - r],
      [cx + r, cy + r],
      [cx - r, cy + r],
    ]
      .map(([x, y], i) => `${(x + (h(k + i) - 0.5) * r * 0.32).toFixed(1)},${(y + (h(k + i + 9) - 0.5) * r * 0.32).toFixed(1)}`)
      .join(" ");
  const r = size / 2;
  const paper = PAPER[Math.floor(h(1) * PAPER.length)];
  // 40%는 안쪽에 종이를 한 겹 더 붙인 모양
  const layered = h(2) < 0.4;
  const inner = layered ? (LIGHT.has(paper) ? "#1d1b19" : ["#efe6cf", "#f2ead6", "#e0a526"][Math.floor(h(3) * 3)]) : paper;
  const onLight = LIGHT.has(inner);
  let ink = (onLight ? INK_ON_LIGHT : INK_ON_DARK)[Math.floor(h(4) * (onLight ? INK_ON_LIGHT : INK_ON_DARK).length)];
  if (accent && h(5) > 0.6 && onLight) ink = accent;
  const shadow = onLight ? (ink === "#1d1b19" ? "#e0a526" : "#1d1b1955") : "#00000088";
  const rot = Math.round((h(6) - 0.5) * 24);
  const font = FONTS[Math.floor(h(7) * FONTS.length)];
  const italic = h(8) > 0.75 ? ' font-style="italic"' : "";
  const fs = size * (font.startsWith("Impact") ? 0.92 : 0.8);
  const off = size * 0.045;
  const ty = cy + fs * 0.34;
  const txt = (x: number, y: number, fill: string) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fs.toFixed(1)}" font-weight="900" text-anchor="middle" font-family="${font}"${italic} fill="${fill}">${ch}</text>`;
  return (
    `<g transform="rotate(${rot} ${cx} ${cy})">` +
    `<polygon points="${quad(r, 10)}" fill="${paper}" stroke="#1d1b1933" stroke-width="1"/>` +
    (h(9) < 0.3 ? `<polygon points="${quad(r, 10)}" fill="url(#ht)"/>` : "") +
    (layered ? `<polygon points="${quad(r * 0.78, 30)}" fill="${inner}"/>` : "") +
    txt(cx + off, ty + off, shadow) +
    txt(cx, ty, ink) +
    `</g>`
  );
}
function collage(text: string, accent?: string) {
  return `<defs>${HALFTONE}</defs>${collageBody(text, accent)}`;
}
function collageBody(text: string, accent?: string) {
  const chars = [...text];
  if (chars.length <= 1) return scrap(chars[0] ?? "?", 50, 50, 78, (chars[0] ?? "?").codePointAt(0)!);
  const perRow = chars.length > 4 ? Math.ceil(chars.length / 2) : chars.length;
  const rows = Math.ceil(chars.length / perRow);
  const size = Math.min(92 / perRow, 90 / rows) * 0.96;
  return chars
    .map((ch, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, chars.length - row * perRow);
      const cx = 50 - ((inRow - 1) * size) / 2 + (i % perRow) * size;
      const cy = 50 - ((rows - 1) * size) / 2 + row * size + ((i % 2) - 0.5) * size * 0.12;
      return scrap(ch, cx, cy, size * 0.98, ch.codePointAt(0)! * 7 + i * 13, accent);
    })
    .join("");
}
const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?♥"];

function variety(text: string, style: CapStyle, c: string, seed: number) {
  if (style === "burst") {
    const pts = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = i % 2 ? 30 : 46 - ((i * 7 + seed) % 5);
      return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r * 0.82).toFixed(1)}`;
    }).join(" ");
    const dark = c === "#d9dde0";
    return `<polygon points="${pts}" fill="${c}" stroke="#2b2b2b" stroke-width="2.5" stroke-linejoin="round"/>${textLines(text, dark ? "#2b2b2b" : "#c92a2a", dark ? "#fff" : "#fff3bf")}`;
  }
  if (style === "cloud") {
    const bumps = [
      [30, 50, 18], [50, 40, 20], [70, 50, 18], [50, 60, 18], [38, 42, 14], [62, 42, 14], [38, 58, 14], [62, 58, 14],
    ];
    const ring = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="${c}"/>`).join("");
    const fill = bumps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join("");
    return `<g transform="translate(0 0)">${ring}${fill}</g>${textLines(text, c === "#3d3d3d" ? "#2b2b2b" : "#1f3c5a")}`;
  }
  if (style === "box") {
    return `<rect x="6" y="24" width="88" height="52" rx="9" fill="#f1f8ff" stroke="${c}" stroke-width="4"/><path d="M24 24l5-9 5 9z" fill="${c}"/>${textLines(text, c, "#fff")}`;
  }
  // blocks: 한 글자씩 기울어진 색 블록
  const chars = [...text];
  const w = 92 / chars.length;
  const size = Math.min(30, w * 0.8);
  return chars
    .map((ch, i) => {
      const x = 4 + i * w;
      const rot = ((i + seed) % 3) * 5 - 5;
      return `<g transform="rotate(${rot} ${x + w / 2} 50)"><rect x="${x + 1}" y="${50 - w / 2}" width="${w - 2}" height="${w - 2}" rx="2" fill="#1a1a1a" stroke="${BLOCK[(i + seed) % BLOCK.length]}" stroke-width="2.5"/><text x="${x + w / 2}" y="${50 + size * 0.3}" font-size="${size}" font-weight="900" text-anchor="middle" font-family="sans-serif" fill="${BLOCK[(i + seed) % BLOCK.length]}">${ch}</text></g>`;
    })
    .join("");
}

const RAW: [string, string, string][] = [
  ["heart", "하트", `<path d="M50 84C20 64 10 48 14 34c4-14 22-18 36-4 14-14 32-10 36 4 4 14-6 30-36 50z" fill="#f6a6bb" ${O}/><path d="M28 34q4-6 10-6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`],
  ["star", "별", `<path d="M50 10l11 25 27 3-20 18 6 27-24-14-24 14 6-27-20-18 27-3z" fill="#ffe58a" ${O}/>${face(50, 50)}`],
  ["sparkle", "반짝", `<path d="M50 8q5 37 42 42-37 5-42 42-5-37-42-42 37-5 42-42z" fill="#fff4c9" ${O}/><path d="M80 14q2 10 10 12-8 2-10 12-2-10-10-12 8-2 10-12z" fill="#a8e6c3" ${O}/>`],
  ["flower", "꽃", `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="27" rx="15" ry="19" fill="#fbd0dc" ${O} transform="rotate(${a} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="14" fill="#ffe58a" ${O}/>`],
  ["clover", "네잎", `${[0, 90, 180, 270].map((a) => `<path d="M50 50C36 40 32 22 42 18s8 8 8 8 0-12 8-8 6 22-8 32z" fill="#7fd6a6" ${O} transform="rotate(${a} 50 50)"/>`).join("")}`],
  ["cloud", "구름", `<path d="M26 74a16 16 0 0 1 0-32 20 20 0 0 1 36-10 16 16 0 0 1 16 20 11 11 0 0 1-4 22z" fill="#fff" ${O}/>${face(50, 54)}`],
  ["ribbon", "리본", `<path d="M50 50L16 30v40zM50 50l34-20v40z" fill="#f6a6bb" ${O}/><path d="M42 54l-8 30 10-6 6 8 4-30zM58 54l8 30-10-6-6 8-4-30z" fill="#f6a6bb" ${O}/><rect x="42" y="42" width="16" height="16" rx="5" fill="#fbd0dc" ${O}/>`],
  ["onigiri", "주먹밥", `<path d="M50 12c10 0 38 50 34 62-3 10-65 10-68 0-4-12 24-62 34-62z" fill="#fff" ${O}/><rect x="34" y="62" width="32" height="24" rx="3" fill="#2f3b36" ${O}/>${face(50, 48)}`],
  ["bun", "찐빵", `<ellipse cx="50" cy="58" rx="38" ry="28" fill="#fff4e6" ${O}/><path d="M40 34q10-10 20 0" fill="none" ${O}/>${face(50, 60)}`],
  ["bear", "곰돌이", `<circle cx="24" cy="28" r="12" fill="#c9a27e" ${O}/><circle cx="76" cy="28" r="12" fill="#c9a27e" ${O}/><circle cx="50" cy="54" r="34" fill="#d9b591" ${O}/><ellipse cx="50" cy="64" rx="13" ry="10" fill="#f3e3d0"/>${face(50, 52)}`],
  ["bunny", "토끼", `<ellipse cx="36" cy="26" rx="9" ry="22" fill="#fff" ${O}/><ellipse cx="64" cy="26" rx="9" ry="22" fill="#fff" ${O}/><circle cx="50" cy="60" r="30" fill="#fff" ${O}/>${face(50, 60)}`],
  ["cat", "고양이", `<path d="M20 44L22 12l22 18M80 44 78 12 56 30" fill="#ffd7a8" ${O}/><ellipse cx="50" cy="58" rx="34" ry="30" fill="#ffd7a8" ${O}/>${face(50, 58)}`],
  ["best", "최고!", `<path d="M14 24h72a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H44l-16 14 2-14H14a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z" fill="#fff" ${O}/><text x="50" y="56" font-size="22" font-weight="900" text-anchor="middle" fill="#145c3d" font-family="sans-serif">최고!</text>`],
  ["bingo", "BINGO", `<circle cx="50" cy="50" r="40" fill="#ffe58a" ${O}/><circle cx="50" cy="50" r="31" fill="none" stroke="#3a2f2a" stroke-width="2" stroke-dasharray="4 4"/><text x="50" y="57" font-size="19" font-weight="900" text-anchor="middle" fill="#6b5300" font-family="sans-serif">BINGO</text>`],
  ["fire", "불꽃", `<path d="M50 90c-20 0-30-14-28-30 2-14 14-20 12-36 12 6 16 16 16 24 4-6 4-12 2-18 14 8 26 22 26 34 0 14-10 26-28 26z" fill="#ffb27a" ${O}/><path d="M50 88c-8 0-12-6-11-12 1-6 7-9 7-16 8 6 14 10 14 18 0 6-4 10-10 10z" fill="#ffe58a"/>`],
  ["check", "완료", `<circle cx="50" cy="50" r="38" fill="#7fd6a6" ${O}/><path d="M32 52l12 12 24-26" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`],
  ...CAPTIONS.map(([id, text, fill], i): [string, string, string] => [id, text, caption(text, fill, i)]),
  ...CAPTIONS2.map(([id, text, style, c], i): [string, string, string] => [id, text.replace("\n", " "), variety(text, style, c, i)]),
];

/** 운영진이 준 동물 짤 스티커 (public/stickers/pets) */
const PET_COUNT = 31;

export const BUILTIN_STICKERS: StickerSrc[] = [
  ...RAW.map(([id, name, body]) => ({
    id: `b:${id}`,
    name,
    src: svgSrc(body),
    cat: id.startsWith("cap-") || id.startsWith("v-") ? "자막" : "캐릭터",
  })),
  ...ALPHABET.map((ch) => ({
    id: `b:abc-${ch.codePointAt(0)}`,
    name: ch,
    src: svgSrc(ch === "♥" ? `<path d="M50 86C20 66 8 50 12 34c4-14 22-18 38-4 16-14 34-10 38 4 4 16-8 32-38 52z" fill="#b23a2e" stroke="#efe6cf" stroke-width="5"/>` : collage(ch)),
    cat: "알파벳",
  })),
  ...Array.from({ length: PET_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `b:pet-${n}`, name: `동물 짤 ${i + 1}`, src: `/stickers/pets/pet-${n}.webp`, cat: "동물" };
  }),
];

/** DB 값(Json)을 안전하게 꾸미기 데이터로 바꾼다 */
export function parseDecor(v: unknown): Decor {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Decor>;
  const num = (n: unknown, lo: number, hi: number, d: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  return {
    theme: typeof o.theme === "string" && (isHex(o.theme) || THEMES.some((t) => t.key === o.theme)) ? o.theme : "",
    items: (Array.isArray(o.items) ? o.items : [])
      .filter((i): i is DecorItem => !!i && typeof i.id === "string" && (/^(b|u):[\w-]{1,40}$/.test(i.id) || i.id === "t:text"))
      .slice(0, MAX_STICKERS)
      .map((i) => {
        const base = { id: i.id, x: num(i.x, 0, 100, 50), y: num(i.y, 0, 100, 50), r: num(i.r, -180, 180, 0), k: num(i.k, 0.5, 2.5, 1) };
        if (i.id !== "t:text") return base;
        return {
          ...base,
          t: String(i.t ?? "").trim().slice(0, TEXT_MAX) || "?",
          s: TEXT_STYLES.some((x) => x.key === i.s) ? i.s : "plain",
          c: typeof i.c === "string" && isHex(i.c) ? i.c : "#ff6b6b",
        };
      }),
    cells: Array.from({ length: 25 }, (_, p) => {
      const k = Array.isArray(o.cells) ? o.cells[p] : "";
      return typeof k === "string" && (isHex(k) || CELL_COLORS.some((c) => c.key === k)) ? k : "";
    }),
  };
}
