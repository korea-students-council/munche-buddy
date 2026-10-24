import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { snowflakeToDate, verifyDiscordSignature } from "./discord-sign";

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // SPKI 의 마지막 32바이트가 원시 공개키
  const publicKeyHex = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
  return { publicKeyHex, privateKey };
}

describe("verifyDiscordSignature", () => {
  const { publicKeyHex, privateKey } = keypair();
  const timestamp = "1700000000";
  const body = '{"type":1}';
  const signatureHex = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");

  it("올바른 서명은 통과", () => {
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp, body })).toBe(true);
  });

  it("본문이 바뀌면 거부", () => {
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp, body: '{"type":2}' })).toBe(false);
  });

  it("타임스탬프가 바뀌면 거부", () => {
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp: "1700000001", body })).toBe(false);
  });

  it("다른 키로 서명하면 거부", () => {
    const other = keypair();
    expect(verifyDiscordSignature({ publicKeyHex: other.publicKeyHex, signatureHex, timestamp, body })).toBe(false);
  });

  it("형식이 잘못된 입력은 예외 없이 거부", () => {
    expect(verifyDiscordSignature({ publicKeyHex: "zz", signatureHex: "nope", timestamp, body })).toBe(false);
    expect(verifyDiscordSignature({ publicKeyHex, signatureHex: "", timestamp, body })).toBe(false);
  });
});

describe("snowflakeToDate", () => {
  it("디스코드 문서의 예시 id를 올바른 시각으로 바꾼다", () => {
    expect(snowflakeToDate("175928847299117063").toISOString()).toBe("2016-04-30T11:18:25.796Z");
  });
});
