/**
 * Vercel Serverless Function — baca data portal (List Server + HMI).
 *
 * KEAMANAN:
 *  1. Data TIDAK dikirim ke browser sebelum password benar.
 *  2. Data disimpan di Vercel Blob (private) — bukan di repo.
 *
 * Alur:
 *   POST { password }  ->  cocok?  ->  balas { servers, hmi }
 *                      ->  salah?  ->  401
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

const PATHNAME = "portal/data.json";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() > rec.until) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function noteFailure(ip: string) {
  const rec = attempts.get(ip) ?? { count: 0, until: Date.now() + LOCK_MS };
  rec.count += 1;
  rec.until = Date.now() + LOCK_MS;
  attempts.set(ip, rec);
}

function clientIp(headers: Record<string, unknown>): string {
  const fwd = headers["x-forwarded-for"];
  const raw = Array.isArray(fwd) ? fwd[0] : (fwd as string | undefined);
  return raw?.split(",")[0]?.trim() || "unknown";
}

async function readData() {
  try {
    const res = await get(PATHNAME, { access: "private", useCache: false });
    if (res?.statusCode === 200 && res.stream) {
      const text = await new Response(res.stream).text();
      return JSON.parse(text);
    }
  } catch {
    /* belum ada -> seed */
  }

  const raw = process.env.PORTAL_DATA;
  if (!raw) throw new Error("Data belum tersedia.");
  const seeded = JSON.parse(raw);
  await put(PATHNAME, JSON.stringify(seeded), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return seeded;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  const ip = clientIp(req.headers as Record<string, unknown>);
  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." });
  }

  const expected = process.env.ACCESS_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: "Server belum dikonfigurasi." });
  }

  const password = String(req.body?.password ?? "");
  if (!password || !safeEqual(password, expected)) {
    noteFailure(ip);
    return res.status(401).json({ error: "Password salah." });
  }

  try {
    const data = await readData();
    attempts.delete(ip);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal memuat data.",
    });
  }
}
