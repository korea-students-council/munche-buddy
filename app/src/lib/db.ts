import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Neon 등의 풀러(pooler) 주소는 prepared statement 때문에 pgbouncer 표시가 필요하다 */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (url && url.includes("-pooler") && !url.includes("pgbouncer")) {
    return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  return url;
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
