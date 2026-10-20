import { EmbedBuilder, type Client } from "discord.js";
import { db } from "../src/lib/db";
import { formatKst } from "../src/lib/time";

const MINT = 0x8fd3a5;
const YELLOW = 0xffd95a;

async function sendableChannel(client: Client, channelId: string) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isSendable()) throw new Error("공지 채널에 메시지를 보낼 수 없어요.");
  return channel;
}

/** 공지할 때가 된 미션을 공지 채널에 올린다: 비대면은 매일, 대면은 시즌 시작 때 한 번에 */
export async function announceDueMissions(client: Client): Promise<void> {
  const now = new Date();
  const events = await db.event.findMany({
    where: { isActive: true, finalizedAt: null, announceChannelId: { not: null } },
  });

  for (const event of events) {
    await announceRemote(client, event, now);
    if (event.startAt <= now && !event.faceAnnouncedAt) await announceFace(client, event, now);
  }
}

type EventRow = Awaited<ReturnType<typeof db.event.findMany>>[number];

async function announceRemote(client: Client, event: EventRow, now: Date) {
  const due = await db.mission.findMany({
    where: { eventId: event.id, type: "REMOTE", announcedAt: null, publishAt: { lte: now } },
    orderBy: { publishAt: "asc" },
  });

  for (const mission of due) {
    // 마감이 지난 미션(봇이 꺼져 있던 경우)은 공지하지 않고 처리만 해둔다
    if (mission.deadlineAt && mission.deadlineAt < now) {
      await db.mission.update({ where: { id: mission.id }, data: { announcedAt: now } });
      continue;
    }
    // 여러 번 실행돼도 한 번만 공지되도록 먼저 선점한다
    const claimed = await db.mission.updateMany({
      where: { id: mission.id, announcedAt: null },
      data: { announcedAt: now },
    });
    if (claimed.count === 0) continue;

    try {
      const channel = await sendableChannel(client, event.announceChannelId!);
      const holders = await db.teamCell.count({ where: { missionId: mission.id } });
      const verify = event.verifyChannelId ? `<#${event.verifyChannelId}>` : "인증 채널";
      const embed = new EmbedBuilder()
        .setColor(MINT)
        .setTitle(`📢 오늘의 비대면 미션 · ${mission.number}번`)
        .setDescription(
          [
            `## ${mission.title}`,
            mission.description,
            `⏰ **${formatKst(mission.deadlineAt)}** 까지`,
            `📸 ${verify} 에서 \`/인증 번호:${mission.number}\`${mission.requirePhoto ? " + 사진 첨부" : " (사진은 선택)"}`,
            `🎯 이 미션이 빙고판에 있는 팀: **${holders}팀**`,
            "👭 팀원 모두가 함께 참여한 인증만 인정돼요.",
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .setFooter({ text: event.name });
      await channel.send({ embeds: [embed] });
      console.log(`[announce] 비대면 ${mission.number}번 ${mission.title}`);
    } catch (err) {
      await db.mission.update({ where: { id: mission.id }, data: { announcedAt: null } });
      console.error(`[announce] 실패: ${mission.number}번`, err);
    }
  }
}

async function announceFace(client: Client, event: EventRow, now: Date) {
  const claimed = await db.event.updateMany({
    where: { id: event.id, faceAnnouncedAt: null },
    data: { faceAnnouncedAt: now },
  });
  if (claimed.count === 0) return;

  try {
    const missions = await db.mission.findMany({
      where: { eventId: event.id, type: "FACE" },
      orderBy: { number: "asc" },
    });
    const channel = await sendableChannel(client, event.announceChannelId!);
    const verify = event.verifyChannelId ? `<#${event.verifyChannelId}>` : "인증 채널";
    const list = missions
      .map((m) => `**${m.number}번** ${m.title}${m.requirePhoto ? "" : " _(사진 선택)_"}${m.description ? `\n└ ${m.description}` : ""}`)
      .join("\n");
    const embed = new EmbedBuilder()
      .setColor(YELLOW)
      .setTitle("🤝 대면 미션 공개!")
      .setDescription(
        [
          list || "등록된 대면 미션이 없어요.",
          "",
          `⏰ 최종 마감 **${formatKst(event.endAt)}** 전까지 언제든 수행하고 인증하세요.`,
          `📸 ${verify} 에서 \`/인증 번호:N\` + 사진 첨부`,
          "👭 팀원 모두가 함께 참여한 인증만 인정돼요.",
        ].join("\n"),
      )
      .setFooter({ text: event.name });
    await channel.send({ embeds: [embed] });
    console.log(`[announce] 대면 미션 ${missions.length}개 일괄 공지`);
  } catch (err) {
    await db.event.update({ where: { id: event.id }, data: { faceAnnouncedAt: null } });
    console.error("[announce] 대면 공지 실패", err);
  }
}
