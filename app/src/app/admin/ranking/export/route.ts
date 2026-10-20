import { NextResponse } from "next/server";
import { getActiveEvent } from "@/lib/event";
import { getCurrentUser } from "@/lib/session";
import { getStandings } from "@/lib/standings";

function csvCell(v: string | number): string {
  let s = String(v);
  // 스프레드시트 수식 주입 방지
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new NextResponse("Forbidden", { status: 403 });

  const event = await getActiveEvent();
  if (!event) return new NextResponse("No active event", { status: 404 });

  const rows = await getStandings(event.id);
  const header = ["순위", "조", "팀명", "팀원", "빙고 줄", "채운 칸", "대면 미션", "빙고판 제출"];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) =>
      [r.rank, r.number, r.name, r.members.join(" / "), r.lines, r.filled, r.faceCount, r.submitted ? "O" : "X"].map(csvCell).join(","),
    ),
  ];

  // BOM: 엑셀에서 한글이 깨지지 않도록
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ranking.csv"`,
    },
  });
}
