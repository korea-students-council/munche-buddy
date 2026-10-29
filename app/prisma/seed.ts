// 로컬 개발용 데모 데이터. 기존 시즌을 모두 지우고 데모 시즌을 새로 만든다.
import type { User } from "@prisma/client";
import { db } from "../src/lib/db";
import { createDemoSeason } from "../src/lib/demo";

if (process.env.NODE_ENV === "production") throw new Error("운영 환경에서는 시드를 실행할 수 없어요.");

async function main() {
  await db.event.deleteMany();

  // 실제 로그인할 운영진(ADMIN_DISCORD_IDS)을 1조에 넣는다
  const realIds = (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const members: User[] = [];
  for (const id of realIds) {
    members.push(await db.user.upsert({ where: { discordId: id }, create: { discordId: id, name: "운영진(나)", isAdmin: true }, update: {} }));
  }

  const res = await createDemoSeason({
    members,
    guildId: process.env.DISCORD_GUILD_ID ?? "demo-guild",
    announceChannelId: process.env.SEED_ANNOUNCE_CHANNEL_ID ?? "demo-announce-channel",
    verifyChannelId: process.env.SEED_VERIFY_CHANNEL_ID ?? "demo-verify-channel",
  });
  console.log(`시드 완료: ${res.summary}`);
  console.log(`오늘의 비대면 미션: ${res.today} (1조는 아직 인증 전)`);
}

main().finally(() => db.$disconnect());
