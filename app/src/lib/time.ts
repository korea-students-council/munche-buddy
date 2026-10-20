// 서비스는 KST(UTC+9) 고정. DB에는 UTC로 저장하고 입출력만 KST로 변환한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 인스턴트를 KST 벽시계 값으로 분해 */
function kstParts(d: Date) {
  const k = new Date(d.getTime() + KST_OFFSET_MS);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth() + 1,
    d: k.getUTCDate(),
    hh: k.getUTCHours(),
    mm: k.getUTCMinutes(),
  };
}

/** YYYY-MM-DD (KST) */
export function kstDay(d: Date): string {
  const p = kstParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** <input type="datetime-local"> 값 (KST) */
export function toKstInput(d: Date | null | undefined): string {
  if (!d) return "";
  const p = kstParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`;
}

/** KST로 해석한 "YYYY-MM-DDTHH:mm" → Date. 형식이 틀리면 null */
export function fromKstInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD" + "HH:mm"(KST) → Date */
export function kstDate(day: string, hhmm: string): Date | null {
  return fromKstInput(`${day}T${hhmm}`);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 예: 10/20(화) 23:59 */
export function formatKst(d: Date | null | undefined, withTime = true): string {
  if (!d) return "-";
  const p = kstParts(d);
  const wd = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  const date = `${p.m}/${p.d}(${wd})`;
  return withTime ? `${date} ${pad(p.hh)}:${pad(p.mm)}` : date;
}

/** "YYYY-MM-DD" 문자열을 한국식 날짜로 */
export function formatDay(day: string | null | undefined): string {
  if (!day) return "-";
  const [y, m, d] = day.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${wd})`;
}

/** 지금부터 target까지 남은 시간을 "2일 3시간", "5시간 20분", "12분" 처럼 */
export function remaining(target: Date, now = new Date()): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "0분";
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
