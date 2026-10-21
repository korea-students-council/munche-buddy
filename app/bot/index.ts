// 짝꽁 빙고 디스코드 봇: `/인증` 슬래시 명령 처리 + 미션 공지
import cron from "node-cron";
import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../src/lib/db";
import { CELL_COUNT, FACE_COUNT } from "../src/lib/rules";
import { REASON_TEXT, attachReply, processSubmission, rejectDeletedMessage } from "../src/lib/verify";
import { announceDueMissions } from "./announce";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("DISCORD_BOT_TOKEN 환경변수가 필요해요.");
  process.exit(1);
}

// 슬래시 명령은 메시지 내용을 읽지 않아서 Message Content Intent가 필요 없다
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const verifyCommand = new SlashCommandBuilder()
  .setName("인증")
  .setDescription("미션을 인증해요 (팀원 모두 참여한 미션만 인정)")
  .setDMPermission(false)
  .addIntegerOption((o) => o.setName("번호").setDescription("인증할 미션 번호").setRequired(true).setMinValue(1))
  .addAttachmentOption((o) => o.setName("사진").setDescription("인증 사진 (사진이 필요한 미션은 필수)").setRequired(false));

async function registerCommands() {
  let guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    const ev = await db.event.findFirst({ where: { isActive: true }, select: { guildId: true } });
    guildId = ev?.guildId ?? undefined;
  }
  if (guildId) {
    await client.application!.commands.set([verifyCommand.toJSON()], guildId);
    console.log(`[commands] 서버 ${guildId} 에 /인증 등록`);
  } else {
    await client.application!.commands.set([verifyCommand.toJSON()]);
    console.log("[commands] 전역 /인증 등록 (반영까지 최대 1시간)");
  }
}

async function handleVerify(interaction: ChatInputCommandInteraction) {
  // 실패 사유는 본인에게만 보이도록 먼저 비공개로 응답을 잡아 둔다
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const photo = interaction.options.getAttachment("사진");
  const isImage = !!photo && (photo.contentType?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp|heic)$/i.test(photo.name));
  const number = interaction.options.getInteger("번호", true);

  const result = await processSubmission({
    discordUserId: interaction.user.id,
    interactionId: interaction.id,
    channelId: interaction.channelId,
    missionNumber: number,
    attachmentUrls: isImage ? [photo!.url] : [],
    postedAt: interaction.createdAt,
  });

  if (!result.ok) {
    const extra = photo && !isImage ? "\n(이미지 파일만 사진으로 인정돼요.)" : "";
    const name = result.missionTitle ? `**${number}번 ${result.missionTitle}** — ` : "";
    await interaction.editReply(`❌ ${name}${REASON_TEXT[result.reason]}${extra}`);
    return;
  }

  const lines = [
    `**${result.teamNumber}조 · ${result.teamName || "이름 없는 팀"}** 이(가) **${result.missionNumber}번 ${result.missionTitle}** 미션을 인증했어요!`,
    result.duplicate
      ? "이미 인증된 미션이라 빙고 칸은 그대로예요. (사진은 기록돼요)"
      : `🟩 채운 칸 **${result.filled}/${CELL_COUNT}** · 빙고 **${result.totalLines}줄** · 대면 **${result.faceCount}/${FACE_COUNT}**`,
  ];
  if (result.newLines > 0) lines.push(`🎉 **빙고!** ${result.newLines}줄이 새로 완성됐어요!`);

  const embed = new EmbedBuilder()
    .setColor(0x8fd3a5)
    .setTitle(result.duplicate ? "🔁 이미 인증한 미션이에요" : "✅ 인증 완료!")
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${interaction.user.displayName} 님이 인증 · 운영진이 사진을 검수해요` });

  // 사진을 봇 메시지로 다시 올려 영구 보관한다 (명령 첨부파일은 오래 남지 않을 수 있다)
  let files: { attachment: string; name: string }[] = [];
  if (isImage) {
    const ext = photo!.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".png";
    files = [{ attachment: photo!.url, name: `bingo-${result.missionNumber}${ext}` }];
    embed.setImage(`attachment://${files[0].name}`);
  }

  await interaction.deleteReply().catch(() => {});
  let message;
  try {
    message = await interaction.followUp({ embeds: [embed], files });
  } catch (err) {
    console.warn("[verify] 사진 재업로드 실패, 원본 주소로 대체", err);
    embed.setImage(isImage ? photo!.url : null);
    message = await interaction.followUp({ embeds: [embed] });
  }
  await attachReply(result.submissionId, message.id, [...message.attachments.values()].map((a) => a.url));
  console.log(`[verify] ${interaction.user.tag} → ${result.missionNumber}번${result.duplicate ? " (중복)" : ""}`);
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "인증") return;
  try {
    await handleVerify(interaction);
  } catch (err) {
    console.error("[verify] 처리 중 오류", err);
    const msg = "⚠️ 처리 중 오류가 생겼어요. 잠시 뒤 다시 시도해 주세요.";
    if (interaction.deferred || interaction.replied) await interaction.editReply(msg).catch(() => {});
    else await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
});

// 운영진이 인증 메시지를 지우면 자동 반려
client.on(Events.MessageDelete, async (message) => {
  try {
    const n = await rejectDeletedMessage(message.id);
    if (n > 0) console.log(`[delete] 메시지 ${message.id} 삭제 → ${n}건 자동 반려`);
  } catch (err) {
    console.error("[delete] 처리 중 오류", err);
  }
});

client.on(Events.Error, (err) => console.error("[client] 오류", err));
client.on(Events.ShardError, (err) => console.error("[shard] 연결 오류", err));

client.once(Events.ClientReady, async (c) => {
  console.log(`[ready] ${c.user.tag} 로 접속했어요.`);
  await registerCommands().catch((e) => console.error("[commands] 등록 실패", e));
  void announceDueMissions(client);
  cron.schedule("* * * * *", () => void announceDueMissions(client).catch((e) => console.error("[announce]", e)));
});

async function shutdown() {
  console.log("[shutdown] 종료 중...");
  await client.destroy();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

client.login(token);
