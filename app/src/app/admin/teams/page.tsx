import { Avatar, Badge, Card, EmptyState, Field, PageTitle, btn, inputCls } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { Flash } from "@/components/flash";
import { db } from "@/lib/db";
import { getActiveEvent } from "@/lib/event";
import { fetchGuildMembers } from "@/lib/discord";
import { TEAM_MAX, TEAM_MIN } from "@/lib/rules";
import { bulkCreateTeams, createTeam, toggleAdmin } from "../actions";
import { TeamDnd } from "./team-dnd";

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const event = await getActiveEvent();
  if (!event) return <EmptyState href="/admin/event?new=1" cta="시즌 만들기">먼저 시즌을 만들어 주세요.</EmptyState>;

  const [teams, users] = await Promise.all([
    db.team.findMany({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
      include: { members: { include: { user: true }, orderBy: { id: "asc" } }, _count: { select: { submissions: true } } },
    }),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const assignedDiscord = new Set(teams.flatMap((t) => t.members.map((m) => m.user.discordId)));

  // 디스코드 서버 멤버를 자동으로 불러온다. 실패하면 웹에 로그인한 사용자 목록으로 대신한다
  const guild = await fetchGuildMembers(event.guildId ?? process.env.DISCORD_GUILD_ID);
  const pool = guild.ok
    ? guild.members
    : users.filter((u) => !u.discordId.startsWith("dev-")).map((u) => ({ id: u.discordId, name: u.name, avatar: u.avatar }));
  const free = pool.filter((m) => !assignedDiscord.has(m.id));

  return (
    <>
      <PageTitle
        title="팀 관리"
        desc={`팀 ${teams.length}개 · 팀원은 ${TEAM_MIN}~${TEAM_MAX}명 · ${guild.ok ? `서버 멤버 ${pool.length}명 중 ` : ""}배정 대기 ${free.length}명`}
        action={
          <form action={createTeam}>
            <input type="hidden" name="eventId" value={event.id} />
            <button className={btn.secondary}>+ 빈 팀 만들기</button>
          </form>
        }
      />
      <Flash ok={sp.ok} error={sp.error} />

      {!guild.ok && (
        <div className="mb-4 rounded-2xl border-2 border-bad/60 bg-bad-soft px-4 py-3 text-sm text-bad">
          <p className="font-black">디스코드 서버 멤버를 불러오지 못했어요</p>
          <p className="mt-1">{guild.error}</p>
          <p className="mt-1 text-xs">지금은 웹에 로그인한 사용자만 팀에 넣을 수 있어요.</p>
        </div>
      )}

      <Card className="mb-6">
        <h2 className="font-black">팀 일괄 만들기</h2>
        <p className="mb-3 mt-1 text-xs text-muted">
          한 줄이 한 팀이에요. 팀원을 <b>디스코드 ID</b>(숫자)로 쉼표나 공백으로 구분해 적어요. 아직 로그인하지 않은 사람도 ID로 미리 편성할 수 있고, 로그인하면 자동으로 연결돼요.
          이미 로그인한 사용자는 이름(중복 없을 때)으로도 쓸 수 있어요.
        </p>
        <form action={bulkCreateTeams} className="space-y-3">
          <input type="hidden" name="eventId" value={event.id} />
          <textarea
            name="text"
            rows={4}
            required
            placeholder={"873412496751480885, 123456789012345678\n111111111111111111 222222222222222222 333333333333333333"}
            className={`${inputCls} font-mono text-xs`}
          />
          <button className={btn.primary}>팀 만들기</button>
        </form>
      </Card>

      {teams.length === 0 ? (
        <EmptyState>편성된 팀이 없어요. 위에서 팀을 만들어 주세요.</EmptyState>
      ) : (
        <TeamDnd
          key={teams.map((t) => t.id + t.members.length).join()}
          free={free.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar ?? null }))}
          teams={teams.map((t) => ({
            id: t.id,
            number: t.number,
            name: t.name,
            color: t.color,
            submitted: !!t.submittedAt,
            members: t.members.map((m) => ({ id: m.user.discordId, name: m.user.name, avatar: m.user.avatar })),
          }))}
        />
      )}

      <h2 className="font-display mb-3 mt-10 text-2xl">전체 사용자</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-sun-soft text-xs">
            <tr>
              <th className="px-3 py-2.5 text-left">이름</th>
              <th className="px-3 py-2.5 text-left">디스코드 ID</th>
              <th className="px-3 py-2.5 text-left">팀</th>
              <th className="px-3 py-2.5 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const team = teams.find((t) => t.members.some((m) => m.userId === u.id));
              return (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <b>{u.name}</b> {u.isAdmin && <Badge tone="sun">어드민</Badge>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{u.discordId}</td>
                  <td className="px-3 py-2">{team ? `${team.number}조 ${team.name}` : <span className="text-muted">미배정</span>}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={toggleAdmin}>
                      <input type="hidden" name="userId" value={u.id} />
                      <ConfirmButton message={`${u.name}님의 어드민 권한을 ${u.isAdmin ? "해제" : "부여"}할까요?`} className={btn.small}>
                        {u.isAdmin ? "어드민 해제" : "어드민 지정"}
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted">
                  아직 사용자가 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
