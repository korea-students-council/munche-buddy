import { db } from "./db";
import type { StickerSrc } from "./decor";

/** 운영진이 올린 스티커 (꾸미기 판에서 기본 스티커 뒤에 붙는다) */
export async function getUploadedStickers(): Promise<StickerSrc[]> {
  const rows = await db.sticker.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((s) => ({ id: `u:${s.id}`, name: s.name, src: s.data, cat: "운영진" }));
}
