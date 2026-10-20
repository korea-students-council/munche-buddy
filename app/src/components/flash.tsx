import { Notice } from "./ui";

/** 서버 액션이 쿼리스트링으로 넘긴 결과 메시지 표시 */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <Notice tone="bad">{error}</Notice>;
  if (ok) return <Notice tone="good">{ok}</Notice>;
  return null;
}
