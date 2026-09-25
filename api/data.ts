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
import { clientIp, clearFailures, noteFailure, rateLimited, safeEqual } from "./_auth";
import { readData } from "./_store";

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
    clearFailures(ip);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal memuat data.",
    });
  }
}
