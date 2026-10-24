import "server-only";
import { db } from "./db";
import { sendChannelMessage, type DiscordEmbed } from "./discord";
import { formatKst } from "./time";

const MINT = 0x8fd3a5;
const YELLOW = 0xffd95a;

type EventRow = Awaited<ReturnType<typeof db.event.findMany>>[number];

/** 공지할 때가 된 미션을 공지 채널에 올린다: 비대면은 매일, 대면은 시즌 시작 때 한 번에 */
export async function announceDueMissions(): Promise<{ remote: number; face: number; errors: number }> {
  const now = new Date();
  const events = await db.event.findMany({
    where: { isActive: true, finalizedAt: null, announceChannelId: { not: null } },
  });
  const out = { remote: 0, face: 0, errors: 0 };
  for (const event of events) {
    const r = await announceRemote(event, now);
    out.remote += r.sent;
    out.errors += r.errors;
    if (event.startAt <= now && !event.faceAnnouncedAt) {
      const f = await announceFace(event, now);
      out.face += f.sent;
      out.errors += f.errors;
    }
  }
  return out;
}

async function announceRemote(event: EventRow, now: Date) {
  const due = await db.mission.findMany({
    where: { eventId: event.id, type: "REMOTE", announcedAt: null, publishAt: { lte: now } },
    orderBy: { publishAt: "asc" },
  });
  let sent = 0;
  let errors = 0;
  for (const mission of due) {
    // 마감이 지난 미션은 공지하지 않고 처리만 해둔다
    if (mission.deadlineAt && mission.deadlineAt < now) {
      await db.mission.update({ where: { id: mission.id }, data: { announcedAt: now } });
      continue;
    }
    // 같은 미션이 두 번 공지되지 않도록 먼저 선점한다
    const claimed = await db.mission.updateMany({ where: { id: mission.id, announcedAt: null }, data: { announcedAt: now } });
    if (claimed.count === 0) continue;
    try {
      const holders = await db.teamCell.count({ where: { missionId: mission.id } });
      const verify = event.verifyChannelId ? `<#${event.verifyChannelId}>` : "인증 채널";
      const embed: DiscordEmbed = {
        color: MINT,
        title: `📢 오늘의 비대면 미션 · ${mission.number}번`,
        description: [
          `## ${mission.title}`,
          mission.description,
          `⏰ **${formatKst(mission.deadlineAt)}** 까지`,
          `📸 ${verify} 에서 \`/인증 번호:${mission.number}\`${mission.requirePhoto ? " + 사진 첨부" : " (사진은 선택)"}`,
          `🎯 이 미션이 빙고판에 있는 팀: **${holders}팀**`,
          "👭 팀원 모두가 함께 참여한 인증만 인정돼요.",
        ]
          .filter(Boolean)
          .join("\n"),
        footer: { text: event.name },
      };
      await sendChannelMessage(event.announceChannelId!, { embeds: [embed] });
      sent++;
    } catch (err) {
      // 보내지 못하면 다음 실행 때 다시 시도하도록 되돌린다
      await db.mission.update({ where: { id: mission.id }, data: { announcedAt: null } });
      console.error(`[announce] 실패: ${mission.number}번`, err);
      errors++;
    }
  }
  return { sent, errors };
}

async function announceFace(event: EventRow, now: Date) {
  const claimed = await db.event.updateMany({ where: { id: event.id, faceAnnouncedAt: null }, data: { faceAnnouncedAt: now } });
  if (claimed.count === 0) return { sent: 0, errors: 0 };
  try {
    const missions = await db.mission.findMany({ where: { eventId: event.id, type: "FACE" }, orderBy: { number: "asc" } });
    const verify = event.verifyChannelId ? `<#${event.verifyChannelId}>` : "인증 채널";
    const list = missions
      .map((m) => `**${m.number}번** ${m.title}${m.requirePhoto ? "" : " _(사진 선택)_"}${m.description ? `\n└ ${m.description}` : ""}`)
      .join("\n");
    await sendChannelMessage(event.announceChannelId!, {
      embeds: [
        {
          color: YELLOW,
          title: "🤝 대면 미션 공개!",
          description: [
            list || "등록된 대면 미션이 없어요.",
            "",
            `⏰ 최종 마감 **${formatKst(event.endAt)}** 전까지 언제든 수행하고 인증하세요.`,
            `📸 ${verify} 에서 \`/인증 번호:N\` + 사진 첨부`,
            "👭 팀원 모두가 함께 참여한 인증만 인정돼요.",
          ].join("\n"),
          footer: { text: event.name },
        },
      ],
    });
    return { sent: 1, errors: 0 };
  } catch (err) {
    await db.event.update({ where: { id: event.id }, data: { faceAnnouncedAt: null } });
    console.error("[announce] 대면 공지 실패", err);
    return { sent: 0, errors: 1 };
  }
}
