import { notFound } from "next/navigation";
import { DecoratedBoard } from "@/components/decorated-board";
import type { BoardCell } from "@/components/bingo-board";
import { parseDecor, type DecorItem } from "@/lib/decor";
import { FACE_POSITIONS } from "@/lib/rules";

/**
 * 꾸미기 예시 빙고판 이미지 내보내기용 화면 (로컬 개발에서만).
 * 카드뉴스 "이렇게 꾸며 보세요" 레퍼런스를 찍을 때 쓴다.
 */

const TITLES = [
  "아침 7시 전에 일어나기", "하늘 사진 찍기", "물 2L 마시기", "팀원에게 칭찬 한마디", "오늘의 점심 인증",
  "만 보 걷기", "대면) 같이 밥 먹기", "좋아하는 노래 공유", "대면) 보드게임 한 판", "책 10쪽 읽기",
  "셀카 찍기", "오늘의 OOTD", "대면) 단체 사진", "스트레칭 5분", "감사한 일 3가지",
  "디저트 인증", "대면) 카페 가기", "방 정리하기", "새로운 음식 도전", "일기 쓰기",
  "산책하며 노을 보기", "팀 구호 만들기", "운동 30분", "밤 12시 전에 자기", "다음 주 계획 세우기",
];
const FILLED = new Set([0, 1, 2, 3, 4, 6, 8, 12, 16, 18, 21]);
const LINE = new Set([0, 1, 2, 3, 4]);

const cells: BoardCell[] = TITLES.map((title, p) => ({
  position: p,
  number: p + 1,
  title: title.replace("대면) ", ""),
  description: "",
  face: FACE_POSITIONS.includes(p),
  requirePhoto: true,
  filled: FILLED.has(p),
  inLine: LINE.has(p),
  today: false,
  when: "",
}));

const s = (id: string, x: number, y: number, r = 0, k = 1): DecorItem => ({ id, x, y, r, k });
const t = (text: string, style: DecorItem["s"], c: string, x: number, y: number, r = 0, k = 1): DecorItem => ({ id: "t:text", t: text, s: style, c, x, y, r, k });
const fill = (f: (p: number) => string) => Array.from({ length: 25 }, (_, p) => f(p));

const A = (ch: string) => `b:abc-${ch.codePointAt(0)}`;

const PRESETS = [
  // 1. J가 짠 판: 검정 테두리, 계획대로 대각선만 머스터드
  {
    theme: "#5c1a24",
    cells: fill((p) => (p % 6 === 0 ? "#c9a27e" : "#f3e9dc")),
    items: [
      t("J가짠판", "collage", "#7a1f2b", 14, 11, -8, 1.8),
      t("계획대로 되고 있어", "plain", "#a0522d", 76, 8, 4, 1.8),
      s(A("1"), 44, 30, -10, 0.7),
      s(A("2"), 64, 50, 8, 0.7),
      s(A("3"), 84, 70, -6, 0.7),
      s("b:check", 30, 30, 0, 0.6),
      s("b:v-injeong", 92, 34, 10, 1.3),
      s("b:pet-03", 10, 52, -8, 1.1),
      t("엑셀로 짰음", "box", "#6b3e26", 52, 64, -4, 1.5),
      s("b:pet-15", 8, 88, -6, 1.2),
      t("P는 그냥 따라옴", "box", "#3b2418", 80, 91, 3, 1.9),
      s(A("?"), 58, 90, 12, 0.7),
    ],
  },
  // 2. 갓생 챌린지: 바랜 종이 테두리 + 근육 짤 총출동
  {
    theme: "#6b3e26",
    cells: fill((p) => (p % 2 ? "#ead9c4" : "#f7efe4")),
    items: [
      t("근손실 오기 전에 인증", "plain", "#7a1f2b", 30, 8, -4, 2),
      s("b:pet-01", 90, 10, 8, 1.1),
      s("b:pet-05", 8, 40, -6, 1.1),
      s("b:pet-12", 93, 52, 4, 1.4),
      s("b:pet-11", 40, 50, 0, 1),
      t("3대 500 가능", "burst", "#c9a27e", 66, 33, 8, 1.4),
      s("b:fire", 24, 68, -10, 0.8),
      s("b:v-limit", 62, 72, -4, 1.5),
      t("득근", "blocks", "#3b2418", 10, 91, -6, 1.3),
      t("오늘도 1칸 적립", "box", "#5c1a24", 68, 92, 3, 1.7),
      s("b:pet-08", 38, 90, 6, 1),
    ],
  },
  // 3. 단톡방 공지: 네이비 테두리 + 읽씹 금지
  {
    theme: "#3b2418",
    cells: fill((p) => ((Math.floor(p / 5) + p) % 2 ? "#e8d6cf" : "#f7efe9")),
    items: [
      t("공지) 읽씹하면 벌칙", "box", "#5c1a24", 26, 9, -3, 2),
      t("1 아직 안 사라짐", "cloud", "#8a5a3b", 84, 9, 5, 1.6),
      s("b:pet-14", 8, 34, -6, 1.1),
      t("ㅇㅋ", "plain", "#6b3e26", 34, 34, -8, 1.3),
      t("확인했습니다(안읽음)", "box", "#7a1f2b", 66, 40, 4, 1.7),
      s("b:pet-19", 92, 58, 6, 1.1),
      s("b:v-dots", 30, 60, 0, 1),
      t("누가 나 불렀어?", "cloud", "#5c1a24", 50, 74, -3, 1.5),
      t("답장 3초 컷", "plain", "#a0522d", 18, 92, -5, 1.7),
      s("b:pet-21", 92, 88, 4, 1.2),
    ],
  },
  // 4. 빙고 도둑 현상수배: 머스터드 테두리 + 레트로 콜라주
  {
    theme: "#8a2c35",
    cells: fill((p) => (p % 7 === 3 ? "#e3c9a8" : "#f1e4cf")),
    items: [
      t("WANTED", "collage", "#7a1f2b", 50, 14, -3, 1.9),
      s(A("!"), 76, 10, 10, 0.8),
      s(A("!"), 84, 12, -6, 0.7),
      s("b:pet-30", 7, 50, -8, 1.2),
      t("인상착의: 판 훔쳐봄", "box", "#3b2418", 50, 42, 3, 1.7),
      s("b:pet-22", 90, 44, 8, 1.1),
      t("목격자 제보 받음", "plain", "#5c1a24", 40, 66, -5, 1.6),
      s("b:pet-18", 88, 74, 0, 1.1),
      t("빙고 도둑", "burst", "#3b2418", 12, 90, -8, 1.4),
      t("현상금: MT 벌칙 면제권", "box", "#7a1f2b", 70, 92, 3, 2),
    ],
  },
  // 5. 알고리즘 탑승: 검정 테두리 + SNS 밈 문구
  {
    theme: "#2a1712",
    cells: fill((p) => ((Math.floor(p / 5) + p) % 2 ? "#e6d3bd" : "#f6ede2")),
    items: [
      t("이 판 알고리즘에 떴다", "plain", "#a0522d", 34, 8, -4, 2),
      t("떡상", "burst", "#c9a27e", 92, 10, 10, 1.3),
      s(A("♥"), 12, 34, -8, 0.8),
      t("좋아요 1.2만", "box", "#7a1f2b", 34, 36, -3, 1.4),
      s("b:pet-10", 70, 34, 6, 1.1),
      t("저장 각", "plain", "#6b3e26", 88, 52, 8, 1.4),
      s("b:pet-27", 46, 58, -4, 1.1),
      t("댓글 달면 빙고", "cloud", "#3b2418", 18, 66, -5, 1.4),
      s("b:pet-24", 8, 88, -4, 1.2),
      s("b:v-real", 44, 90, 4, 1.4),
      t("좋아요 25개 = 빙고", "box", "#3b2418", 76, 92, 3, 1.9),
    ],
  },
];

export default async function DecorPreviewPage({ params }: { params: Promise<{ n: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const n = Number((await params).n);
  const preset = PRESETS[n - 1];
  if (!preset) notFound();
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-bg p-10">
      <style>{"nextjs-portal,aside,[aria-label='보기 방식'],section>ul{display:none!important}[aria-selected=true]{box-shadow:none!important;transform:none!important}"}</style>
      <DecoratedBoard n={5} color="MINT" cells={cells} withCommand={false} decor={parseDecor(preset)} />
    </div>
  );
}
