// 디스코드가 보낸 요청이 진짜인지 확인한다 (Ed25519 서명). Node 기본 crypto만 사용한다.
import { createPublicKey, verify } from "node:crypto";

/** 32바이트 Ed25519 공개키를 SPKI(DER)로 감싸는 고정 접두어 */
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(args: {
  /** 개발자 포털 General Information 의 Public Key (16진수) */
  publicKeyHex: string;
  signatureHex: string;
  timestamp: string;
  /** 읽은 그대로의 요청 본문 */
  body: string;
}): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(args.publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(args.timestamp + args.body), key, Buffer.from(args.signatureHex, "hex"));
  } catch {
    return false;
  }
}

/** 디스코드 스노플레이크 id → 만들어진 시각 */
export function snowflakeToDate(id: string): Date {
  return new Date(Number((BigInt(id) >> BigInt(22)) + BigInt("1420070400000")));
}
