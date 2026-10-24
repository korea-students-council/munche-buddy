import "server-only";
import { CELL_COUNT, FACE_COUNT } from "./rules";
import {
  deleteOriginalResponse,
  editOriginalResponse,
  sendFollowup,
  type DiscordEmbed,
} from "./discord";
import { snowflakeToDate } from "./discord-sign";
import { REASON_TEXT, attachReply, processSubmission } from "./verify";

/** `/인증 번호:12 사진:(첨부)` — 서버에 등록하는 명령 정의 */
export const VERIFY_COMMAND = {
  name: "인증",
  type: 1,
  description: "미션을 인증해요 (팀원 모두 참여한 미션만 인정)",
  dm_permission: false,
  options: [
    { type: 4, name: "번호", description: "인증할 미션 번호", required: true, min_value: 1 },
    { type: 11, name: "사진", description: "인증 사진 (사진이 필요한 미션은 필수)", required: false },
  ],
};

type Attachment = { id: string; filename: string; content_type?: string; url: string };
export type Interaction = {
  id: string;
  application_id: string;
  token: string;
  channel_id: string;
  member?: { user: { id: string; global_name?: string | null; username: string } };
  user?: { id: string; global_name?: string | null; username: string };
  data?: {
    name: string;
    options?: { name: string; type: number; value: number | string }[];
    resolved?: { attachments?: Record<string, Attachment> };
  };
};

const MINT = 0x8fd3a5;

function isImage(a: Attachment | undefined): a is Attachment {
  return !!a && (a.content_type?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp|heic)$/i.test(a.filename));
}

/**
 * 처음 응답(비공개 "생각 중")을 이미 보낸 뒤 실행한다.
 * 실패하면 본인에게만 보이는 안내로 고치고, 성공하면 채널에 사진 포함 인증 기록을 공개로 남긴다.
 */
export async function runVerifyCommand(i: Interaction): Promise<void> {
  const app = i.application_id;
  try {
    const opts = new Map((i.data?.options ?? []).map((o) => [o.name, o.value]));
    const number = Number(opts.get("번호"));
    const attachmentId = opts.get("사진");
    const raw = attachmentId ? i.data?.resolved?.attachments?.[String(attachmentId)] : undefined;
    const photo = isImage(raw) ? raw : undefined;
    const user = i.member?.user ?? i.user;
    if (!user || !Number.isInteger(number)) {
      await editOriginalResponse(app, i.token, { content: "❌ 명령을 이해하지 못했어요. 번호를 다시 확인해 주세요." });
      return;
    }

    const result = await processSubmission({
      discordUserId: user.id,
      interactionId: i.id,
      channelId: i.channel_id,
      missionNumber: number,
      attachmentUrls: photo ? [photo.url] : [],
      postedAt: snowflakeToDate(i.id),
    });

    if (!result.ok) {
      const extra = raw && !photo ? "\n(이미지 파일만 사진으로 인정돼요.)" : "";
      const name = result.missionTitle ? `**${number}번 ${result.missionTitle}** — ` : "";
      await editOriginalResponse(app, i.token, { content: `❌ ${name}${REASON_TEXT[result.reason]}${extra}` });
      return;
    }

    const lines = [
      `**${result.teamNumber}조 · ${result.teamName || "이름 없는 팀"}** 이(가) **${result.missionNumber}번 ${result.missionTitle}** 미션을 인증했어요!`,
      result.duplicate
        ? "이미 인증된 미션이라 빙고 칸은 그대로예요. (사진은 기록돼요)"
        : `🟩 채운 칸 **${result.filled}/${CELL_COUNT}** · 빙고 **${result.totalLines}줄** · 대면 **${result.faceCount}/${FACE_COUNT}**`,
    ];
    if (result.newLines > 0) lines.push(`🎉 **빙고!** ${result.newLines}줄이 새로 완성됐어요!`);
    const embed: DiscordEmbed = {
      title: result.duplicate ? "🔁 이미 인증한 미션이에요" : "✅ 인증 완료!",
      description: lines.join("\n"),
      color: MINT,
      footer: { text: `${user.global_name || user.username} 님이 인증 · 운영진이 사진을 검수해요` },
    };

    // 사진을 봇 메시지로 다시 올려 영구 보관한다 (명령 첨부파일은 오래 남지 않을 수 있다)
    let file: { name: string; data: ArrayBuffer; type: string } | undefined;
    if (photo) {
      try {
        const res = await fetch(photo.url);
        if (res.ok) {
          const ext = photo.filename.match(/\.[a-z0-9]+$/i)?.[0] ?? ".png";
          file = { name: `bingo-${result.missionNumber}${ext}`, data: await res.arrayBuffer(), type: photo.content_type ?? "image/png" };
          embed.image = { url: `attachment://${file.name}` };
        }
      } catch {
        // 내려받지 못하면 원본 주소로 대신 보여준다
      }
      if (!file) embed.image = { url: photo.url };
    }

    await deleteOriginalResponse(app, i.token).catch(() => {});
    const message = await sendFollowup(app, i.token, { embeds: [embed] }, file);
    await attachReply(result.submissionId, message.id, (message.attachments ?? []).map((a) => a.url));
  } catch (err) {
    console.error("[interactions] /인증 처리 오류", err);
    await editOriginalResponse(app, i.token, { content: "⚠️ 처리 중 오류가 생겼어요. 잠시 뒤 다시 시도해 주세요." }).catch(() => {});
  }
}
