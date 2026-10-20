import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  // 303: POST 이후 GET으로 이동
  const res = NextResponse.redirect(new URL("/", appUrl()), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
