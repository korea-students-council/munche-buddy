import "server-only";

/**
 * 디스코드 첨부파일 주소는 일정 시간이 지나면 만료된다. 봇 토큰으로 새 주소를 받아온다.
 * 실패하면 원래 주소를 그대로 돌려준다.
 */
export async function refreshAttachmentUrls(urls: string[]): Promise<Map<string, string>> {
  const map = new Map(urls.map((u) => [u, u]));
  const token = process.env.DISCORD_BOT_TOKEN;
  const unique = [...new Set(urls)].filter((u) => u.includes("discordapp"));
  if (!token || unique.length === 0) return map;
  try {
    for (let i = 0; i < unique.length; i += 50) {
      const res = await fetch("https://discord.com/api/v10/attachments/refresh-urls", {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ attachment_urls: unique.slice(i, i + 50) }),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { refreshed_urls?: { original: string; refreshed: string }[] };
      data.refreshed_urls?.forEach((r) => map.set(r.original, r.refreshed));
    }
  } catch {
    // 새로고침에 실패해도 화면은 원래 주소로 보여준다
  }
  return map;
}

// ── 서버 멤버 조회 ───────────────────────────────────────────

export type GuildMember = { id: string; name: string; avatar: string | null };

type RawMember = {
  nick?: string | null;
  avatar?: string | null;
  user?: { id: string; username: string; global_name?: string | null; avatar?: string | null; bot?: boolean };
};

function toMember(m: RawMember): GuildMember | null {
  if (!m.user || m.user.bot) return null;
  const u = m.user;
  const hash = u.avatar;
  return {
    id: u.id,
    name: m.nick || u.global_name || u.username,
    avatar: hash ? `https://cdn.discordapp.com/avatars/${u.id}/${hash}.png?size=64` : null,
  };
}

function explain(status: number): string {
  if (status === 401) return "봇 토큰이 올바르지 않아요. (DISCORD_BOT_TOKEN)";
  if (status === 403) {
    return "서버 멤버를 읽을 수 없어요. 디스코드 개발자 포털 → Bot 메뉴에서 'Server Members Intent'를 켜고, 봇이 서버에 들어와 있는지 확인해 주세요.";
  }
  if (status === 404) return "서버를 찾을 수 없어요. 시즌 설정의 서버 ID와 봇 초대 여부를 확인해 주세요.";
  return `디스코드에서 멤버를 가져오지 못했어요. (오류 ${status})`;
}

/** 서버의 사람(봇 제외) 전체. 1000명 단위로 모두 불러온다 */
export async function fetchGuildMembers(
  guildId: string | null | undefined,
): Promise<{ ok: true; members: GuildMember[] } | { ok: false; error: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { ok: false, error: "DISCORD_BOT_TOKEN이 설정되지 않았어요." };
  if (!guildId) return { ok: false, error: "시즌 설정에 서버(길드) ID를 입력해 주세요." };

  const members: GuildMember[] = [];
  let after = "0";
  try {
    for (let page = 0; page < 20; page++) {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: explain(res.status) };
      const batch = (await res.json()) as RawMember[];
      for (const raw of batch) {
        const m = toMember(raw);
        if (m) members.push(m);
      }
      if (batch.length < 1000) break;
      after = batch[batch.length - 1].user?.id ?? after;
    }
  } catch {
    return { ok: false, error: "디스코드에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  members.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return { ok: true, members };
}

/** 서버 멤버 한 명. 서버에 없으면 null, 조회 자체가 실패하면 undefined */
export async function fetchGuildMember(guildId: string, userId: string): Promise<GuildMember | null | undefined> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return undefined;
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    return toMember((await res.json()) as RawMember);
  } catch {
    return undefined;
  }
}
