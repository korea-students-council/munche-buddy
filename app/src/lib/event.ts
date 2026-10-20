import type { Event, Mission } from "@prisma/client";
import { db } from "./db";

export type Phase = "upcoming" | "running" | "ended";

export function eventPhase(e: Pick<Event, "startAt" | "endAt">, now = new Date()): Phase {
  if (now < e.startAt) return "upcoming";
  if (now > e.endAt) return "ended";
  return "running";
}

export const PHASE_LABEL: Record<Phase, string> = {
  upcoming: "시작 전",
  running: "진행 중",
  ended: "종료",
};

/** 현재 활성 시즌. 없으면 null */
export async function getActiveEvent(): Promise<Event | null> {
  return db.event.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
}

/**
 * 미션을 인증할 수 있는 기간.
 * 대면 미션은 시즌 시작~최종 마감, 비대면 미션은 공지 시각~그날 23:59(마감 시각 포함).
 */
export function missionWindow(
  m: Pick<Mission, "type" | "publishAt" | "deadlineAt">,
  e: Pick<Event, "startAt" | "endAt">,
): { opensAt: Date | null; closesAt: Date | null } {
  if (m.type === "FACE") return { opensAt: e.startAt, closesAt: e.endAt };
  return { opensAt: m.publishAt, closesAt: m.deadlineAt };
}

export function isOpenAt(
  m: Pick<Mission, "type" | "publishAt" | "deadlineAt">,
  e: Pick<Event, "startAt" | "endAt">,
  at: Date,
): boolean {
  const { opensAt, closesAt } = missionWindow(m, e);
  return opensAt !== null && closesAt !== null && opensAt <= at && at <= closesAt;
}

/** 지금 공지되어 있는 비대면 미션 (겹치면 가장 늦게 공지된 것) */
export async function getTodayRemoteMission(eventId: string, at = new Date()): Promise<Mission | null> {
  return db.mission.findFirst({
    where: { eventId, type: "REMOTE", publishAt: { lte: at }, deadlineAt: { gte: at } },
    orderBy: { publishAt: "desc" },
  });
}

export async function getNextRemoteMission(eventId: string, at = new Date()): Promise<Mission | null> {
  return db.mission.findFirst({
    where: { eventId, type: "REMOTE", publishAt: { gt: at } },
    orderBy: { publishAt: "asc" },
  });
}

/** 참여자에게 미션 내용을 보여줘도 되는가 (대면은 시작 후, 비대면은 공지 시각 이후) */
export function isRevealed(
  m: Pick<Mission, "type" | "publishAt">,
  e: Pick<Event, "startAt">,
  now = new Date(),
): boolean {
  if (m.type === "FACE") return e.startAt <= now;
  return m.publishAt !== null && m.publishAt <= now;
}
