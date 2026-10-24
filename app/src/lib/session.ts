import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@prisma/client";
import { db } from "./db";

export const SESSION_COOKIE = "jk_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function key() {
  let secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // SESSION_SECRET이 없으면 DB 접속 정보(비밀번호 포함)로부터 서명키를 만든다.
    // DB 접속 정보가 새면 어차피 DB 전체가 노출되므로 안전성은 같고, 설정 한 가지를 줄일 수 있다.
    const dbUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("SESSION_SECRET(32자 이상) 또는 DATABASE_URL 환경변수가 필요합니다.");
    secret = createHash("sha256").update(`jjakkkong-session:${dbUrl}`).digest("hex");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(key());
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SEC,
};

/** 로그인한 사용자. 없으면 null (요청당 1회만 조회) */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (typeof payload.uid !== "string") return null;
    return await db.user.findUnique({ where: { id: payload.uid } });
  } catch {
    return null;
  }
});

export async function requireUser(next = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/discord?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/discord?next=${encodeURIComponent("/admin")}`);
  if (!user.isAdmin) redirect("/?denied=1");
  return user;
}

export function adminIdsFromEnv(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
