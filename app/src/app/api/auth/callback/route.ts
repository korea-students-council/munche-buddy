import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appUrl, safeNext } from "@/lib/env";
import { SESSION_COOKIE, adminIdsFromEnv, sessionCookieOptions, signSession } from "@/lib/session";

type DiscordUser = { id: string; username: string; global_name?: string | null; avatar?: string | null };

function fail(code: string) {
  const res = NextResponse.redirect(new URL(`/?error=${code}`, appUrl()));
  res.cookies.delete("jk_oauth");
  return res;
}

async function isGuildMember(userId: string): Promise<boolean | null> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return true; // 서버 검사를 쓰지 않는 설정
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null; // 검사해야 하는데 봇 토큰이 없음 → 설정 오류
  const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (r.status === 200) return true;
  if (r.status === 404) return false;
  return null;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (req.nextUrl.searchParams.get("error")) return fail("oauth_denied");
  if (!code || !state) return fail("oauth_failed");

  let saved: { state: string; next: string } | null = null;
  try {
    saved = JSON.parse(req.cookies.get("jk_oauth")?.value ?? "null");
  } catch {
    saved = null;
  }
  if (!saved || saved.state !== state) return fail("oauth_state");

  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl()}/api/auth/callback`,
    }),
  });
  if (!tokenRes.ok) return fail("oauth_failed");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return fail("oauth_failed");
  const me = (await meRes.json()) as DiscordUser;

  const member = await isGuildMember(me.id);
  if (member === null) return fail("guild_check_failed");
  if (member === false) return fail("not_member");

  const name = me.global_name || me.username;
  const avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null;
  const makeAdmin = adminIdsFromEnv().includes(me.id);

  const user = await db.user.upsert({
    where: { discordId: me.id },
    create: { discordId: me.id, name, avatar, isAdmin: makeAdmin },
    update: { name, avatar, ...(makeAdmin ? { isAdmin: true } : {}) },
  });

  const res = NextResponse.redirect(new URL(safeNext(saved.next), appUrl()));
  res.cookies.delete("jk_oauth");
  res.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  return res;
}
