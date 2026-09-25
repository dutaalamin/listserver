import { timingSafeEqual } from "node:crypto";

/** Bandingkan dua string dengan waktu konstan (anti timing attack). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

export function rateLimited(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.until) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function noteFailure(ip: string) {
  const rec = attempts.get(ip) ?? { count: 0, until: Date.now() + LOCK_MS };
  rec.count += 1;
  rec.until = Date.now() + LOCK_MS;
  attempts.set(ip, rec);
}

export function clearFailures(ip: string) {
  attempts.delete(ip);
}

export function clientIp(headers: Record<string, unknown>): string {
  const fwd = headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : (fwd as string | undefined);
  return raw?.split(",")[0]?.trim() || "unknown";
}
