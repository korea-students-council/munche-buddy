import { announceDueMissions } from "@/lib/announce";

/**
 * 매일 오전 7시(KST)대에 Vercel 크론이 호출한다. (vercel.json)
 * CRON_SECRET 환경변수를 설정해 두면 Vercel이 `Authorization: Bearer <CRON_SECRET>` 헤더를 자동으로 붙여준다.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await announceDueMissions();
  return Response.json(result);
}
