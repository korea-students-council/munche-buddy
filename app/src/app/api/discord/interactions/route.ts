import { after } from "next/server";
import { verifyDiscordSignature } from "@/lib/discord-sign";
import { runVerifyCommand, VERIFY_COMMAND, type Interaction } from "@/lib/interactions";

// 사진을 내려받아 다시 올리는 시간까지 여유를 둔다
export const maxDuration = 30;

const PING = 1;
const APPLICATION_COMMAND = 2;

/** 디스코드가 슬래시 명령을 이 주소로 보내준다. 개발자 포털 Interactions Endpoint URL 에 등록한다. */
export async function POST(req: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return new Response("DISCORD_PUBLIC_KEY is not configured", { status: 503 });

  const body = await req.text();
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !verifyDiscordSignature({ publicKeyHex: publicKey, signatureHex: signature, timestamp, body })) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(body) as Interaction & { type: number };

  if (interaction.type === PING) return Response.json({ type: 1 });

  if (interaction.type === APPLICATION_COMMAND && interaction.data?.name === VERIFY_COMMAND.name) {
    // 디스코드는 3초 안에 응답을 요구한다. 먼저 "처리 중"(본인에게만 보임)으로 답하고, 실제 처리는 응답 뒤에 이어서 한다.
    after(() => runVerifyCommand(interaction));
    return Response.json({ type: 5, data: { flags: 64 } });
  }

  return Response.json({ type: 4, data: { content: "알 수 없는 명령이에요.", flags: 64 } });
}
