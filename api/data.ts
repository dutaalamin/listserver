/**
 * Vercel Serverless Function — sumber data portal (List Server + HMI).
 *
 * KEAMANAN:
 *  1. Data TIDAK dikirim ke browser sebelum password benar.
 *  2. Data disimpan di environment variable `PORTAL_DATA` (terenkripsi di
 *     Vercel), bukan di repo. Walau repo publik, isinya tidak bocor.
 *
 * Alur:
 *   POST { password }  ->  cocok?  ->  balas { servers, hmi }
 *                      ->  salah?  ->  401
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." });
  }

  const expected = process.env.ACCESS_PASSWORD;
  const rawData = process.env.PORTAL_DATA;

  if (!expected || !rawData) {
    return res.status(500).json({
      error: "Server belum dikonfigurasi (ACCESS_PASSWORD / PORTAL_DATA belum di-set).",
    });
  }

  const password = String(req.body?.password ?? "");
  if (!password || !safeEqual(password, expected)) {
    noteFailure(ip);
    return res.status(401).json({ error: "Password salah." });
  }

  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    return res.status(500).json({ error: "Format data tidak valid." });
  }

  attempts.delete(ip);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(data);
}
