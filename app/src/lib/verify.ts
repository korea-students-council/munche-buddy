// `/인증 12` 명령을 검사해 팀의 빙고 칸을 채우는 서비스. 봇은 이 함수만 호출한다.
import { db } from "./db";
import { missionWindow } from "./event";
import { getTeamBoardState } from "./standings";

export type SubmissionInput = {
  discordUserId: string;
  /** 슬래시 명령 interaction id (중복 처리 방지) */
  interactionId: string;
  channelId: string;
  missionNumber: number;
  /** 사진으로 인정되는 첨부(이미지)의 URL */
  attachmentUrls: string[];
  postedAt: Date;
};

export type RejectReason =
  | "NOT_VERIFY_CHANNEL"
  | "NO_USER"
  | "NO_TEAM"
  | "NO_BOARD"
  | "NOT_STARTED"
  | "ENDED"
  | "NO_MISSION"
  | "NOT_IN_BOARD"
  | "NOT_OPEN"
  | "CLOSED"
  | "NEED_PHOTO"
  | "ALREADY_RECORDED";

export type VerifyResult =
  | {
      ok: true;
      submissionId: string;
      missionNumber: number;
      missionTitle: string;
      teamName: string;
      teamNumber: number;
      /** 이미 인증된 미션을 한 번 더 인증한 경우 */
      duplicate: boolean;
      newLines: number;
      totalLines: number;
      filled: number;
      faceCount: number;
    }
  | { ok: false; reason: RejectReason; missionTitle?: string };

export const REASON_TEXT: Record<RejectReason, string> = {
  NOT_VERIFY_CHANNEL: "인증 채널에서 사용해 주세요.",
  NO_USER: "웹에서 디스코드로 한 번 로그인해야 인증할 수 있어요. 로그인 후 다시 시도해 주세요.",
  NO_TEAM: "아직 팀에 배정되지 않았어요. 운영진에게 문의해 주세요.",
  NO_BOARD: "우리 팀이 아직 빙고판을 제출하지 않았어요. 제출한 팀만 인증할 수 있어요.",
  NOT_STARTED: "아직 짝꽁 사업이 시작되지 않았어요.",
  ENDED: "짝꽁 사업이 끝났어요. 최종 마감 이후에는 인증할 수 없어요.",
  NO_MISSION: "그 번호의 미션이 없어요. 번호를 다시 확인해 주세요.",
  NOT_IN_BOARD: "그 미션은 우리 팀 빙고판에 없어서 칸을 채울 수 없어요.",
  NOT_OPEN: "아직 공지되지 않은 미션이에요. 공지 이후에 인증해 주세요.",
  CLOSED: "인증 기간이 지난 미션이에요. 비대면 미션은 공지된 당일 23:59까지만 인증할 수 있어요.",
  NEED_PHOTO: "이 미션은 사진이 필요해요. 사진을 첨부해서 다시 인증해 주세요.",
  ALREADY_RECORDED: "이미 처리된 요청이에요.",
};

export async function processSubmission(input: SubmissionInput): Promise<VerifyResult> {
  const event = await db.event.findFirst({
    where: { isActive: true, verifyChannelId: input.channelId, finalizedAt: null },
  });
  if (!event) return { ok: false, reason: "NOT_VERIFY_CHANNEL" };

  if (await db.submission.findUnique({ where: { externalId: input.interactionId } })) {
    return { ok: false, reason: "ALREADY_RECORDED" };
  }

  const user = await db.user.findUnique({ where: { discordId: input.discordUserId } });
  if (!user) return { ok: false, reason: "NO_USER" };

  const membership = await db.teamMember.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    include: { team: { include: { cells: true } } },
  });
  if (!membership) return { ok: false, reason: "NO_TEAM" };
  const team = membership.team;
  if (!team.submittedAt || team.cells.length === 0) return { ok: false, reason: "NO_BOARD" };

  if (input.postedAt < event.startAt) return { ok: false, reason: "NOT_STARTED" };
  if (input.postedAt > event.endAt) return { ok: false, reason: "ENDED" };

  const mission = await db.mission.findUnique({
    where: { eventId_number: { eventId: event.id, number: input.missionNumber } },
  });
  if (!mission) return { ok: false, reason: "NO_MISSION" };

  if (!team.cells.some((c) => c.missionId === mission.id)) {
    return { ok: false, reason: "NOT_IN_BOARD", missionTitle: mission.title };
  }

  const { opensAt, closesAt } = missionWindow(mission, event);
  if (!opensAt || !closesAt || input.postedAt < opensAt) {
    return { ok: false, reason: "NOT_OPEN", missionTitle: mission.title };
  }
  if (input.postedAt > closesAt) return { ok: false, reason: "CLOSED", missionTitle: mission.title };

  if (mission.requirePhoto && input.attachmentUrls.length === 0) {
    return { ok: false, reason: "NEED_PHOTO", missionTitle: mission.title };
  }

  const before = await getTeamBoardState(event.id, team.id);
  const duplicate = before?.cells.some((c) => c.missionId === mission.id && c.filledAt !== null) ?? false;

  let submissionId: string;
  try {
    const created = await db.submission.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        userId: user.id,
        missionId: mission.id,
        externalId: input.interactionId,
        channelId: input.channelId,
        attachmentUrls: input.attachmentUrls,
        postedAt: input.postedAt,
      },
    });
    submissionId = created.id;
  } catch (e) {
    // 같은 interaction이 동시에 두 번 들어온 경우 (unique 위반)
    if ((e as { code?: string }).code === "P2002") return { ok: false, reason: "ALREADY_RECORDED" };
    throw e;
  }

  const after = await getTeamBoardState(event.id, team.id);
  const totalLines = after?.evaluation.lines ?? 0;
  return {
    ok: true,
    submissionId,
    missionNumber: mission.number,
    missionTitle: mission.title,
    teamName: team.name,
    teamNumber: team.number,
    duplicate,
    newLines: totalLines - (before?.evaluation.lines ?? 0),
    totalLines,
    filled: after?.evaluation.filled ?? 0,
    faceCount: after?.evaluation.faceCount ?? 0,
  };
}

/** 봇이 인증 내용을 다시 올린 메시지(사진 보관본)의 id와 영구 사진 주소를 기록한다 */
export async function attachReply(submissionId: string, replyMessageId: string, attachmentUrls: string[]) {
  await db.submission.update({
    where: { id: submissionId },
    data: { replyMessageId, ...(attachmentUrls.length > 0 ? { attachmentUrls } : {}) },
  });
}
