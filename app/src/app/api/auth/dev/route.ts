// 로컬 개발 전용 테스트 로그인. DEV_LOGIN=true 이고 production이 아닐 때만 동작한다.
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appUrl, safeNext } from "@/lib/env";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.DEV_LOGIN !== "true") {
    return new NextResponse("Not Found", { status: 404 });
  }
  const p = req.nextUrl.searchParams;
  const id = (p.get("id") ?? "tester").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "tester";
  const name = (p.get("name") ?? id).slice(0, 32);
  const admin = p.get("admin") === "1";

  const user = await db.user.upsert({
    where: { discordId: `dev-${id}` },
    create: { discordId: `dev-${id}`, name, isAdmin: admin },
    update: { name, isAdmin: admin },
  });

  const res = NextResponse.redirect(new URL(safeNext(p.get("next")), appUrl()));
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  return res;
}
