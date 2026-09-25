/**
 * Vercel Serverless Function — tambah / ubah / hapus server di List Server.
 *
 * Body:
 *   { password, action: "save", server: { id?, name, ipAddress, location, category } }
 *   { password, action: "delete", id }
 *
 * Balasan: { ok, servers }  (seluruh daftar terbaru)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

const PATHNAME = "portal/data.json";

const EDITABLE = ["name", "ipAddress", "location", "category"];

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
    return res.status(429).json({ error: "Terlalu banyak percobaan." });
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

  const action = String(req.body?.action ?? "save");

  try {
    const data = (await readData()) as {
      servers: Record<string, unknown>[];
      hmi: unknown[];
    };

    if (action === "delete") {
      const id = Number(req.body?.id);
      const sebelum = data.servers.length;
      data.servers = data.servers.filter((s) => Number(s.id) !== id);
      if (data.servers.length === sebelum) {
        return res.status(404).json({ error: `Server #${id} tidak ditemukan.` });
      }
    } else {
      const src = (req.body?.server ?? {}) as Record<string, unknown>;

      // Ambil hanya field yang diizinkan
      const bersih: Record<string, unknown> = {};
      for (const k of EDITABLE) {
        if (k in src) bersih[k] = String(src[k] ?? "").trim();
      }

      if (!bersih.name) {
        return res.status(400).json({ error: "Nama client wajib diisi." });
      }
      if (!bersih.ipAddress) {
        return res.status(400).json({ error: "IP Address wajib diisi." });
      }
      if (!bersih.category) {
        return res.status(400).json({ error: "Kategori wajib diisi." });
      }

      const id = Number(src.id);
      const idx = Number.isFinite(id)
        ? data.servers.findIndex((s) => Number(s.id) === id)
        : -1;

      if (idx >= 0) {
        data.servers[idx] = { ...data.servers[idx], ...bersih };
      } else {
        // Tambah baru — id = terbesar + 1
        const maxId = data.servers.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0);
        data.servers.push({ id: maxId + 1, ...bersih });
      }
    }

    await put(PATHNAME, JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, servers: data.servers });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal menyimpan.",
    });
  }
}
