/**
 * Vercel Serverless Function — simpan perubahan satu komputer HMI.
 *
 * Alur:
 *   POST { password, no, patch }  ->  cocok?  ->  update & simpan  ->  { ok, computer }
 *                                 ->  salah?  ->  401
 *
 * Hanya field di EDITABLE_FIELDS yang diterima (whitelist).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

const PATHNAME = "portal/data.json";

/** Field HMI yang boleh diubah dari UI (whitelist). */
const EDITABLE_FIELDS = [
  "hostname",
  "username",
  "password",
  "ip",
  "mac1",
  "mac2",
  "location",
  "room",
  "computer",
  "monitor",
  "displayOutput",
  "monitorInput",
  "osVersion",
  "framework",
  "antivirus",
  "osBlock",
  "diskType",
  "diskCapacity",
  "diskQty",
  "usbQty",
  "usbUsage",
  "specialSoftware",
  "specialHardware",
];

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

async function writeData(data: unknown) {
  await put(PATHNAME, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
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

  const no = Number(req.body?.no);
  if (!Number.isFinite(no)) {
    return res.status(400).json({ error: "Nomor komputer tidak valid." });
  }

  const patch = req.body?.patch;
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "Data perubahan tidak valid." });
  }

  try {
    const data = (await readData()) as { servers: unknown[]; hmi: Record<string, unknown>[] };
    const idx = data.hmi.findIndex((c) => Number(c.no) === no);
    if (idx === -1) {
      return res.status(404).json({ error: `Komputer #${no} tidak ditemukan.` });
    }

    // Ambil hanya field yang diizinkan (whitelist)
    const bersih: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in patch) bersih[key] = (patch as Record<string, unknown>)[key];
    }
    if (Object.keys(bersih).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang bisa diubah." });
    }

    // Normalisasi angka
    for (const k of ["usbQty", "usbUsage", "osBlock", "diskQty"]) {
      if (k in bersih) {
        const n = Number(bersih[k]);
        if (!Number.isFinite(n)) {
          return res.status(400).json({ error: `Nilai ${k} harus berupa angka.` });
        }
        bersih[k] = n;
      }
    }
    // String kosong -> null untuk field opsional
    for (const k of ["mac2", "specialSoftware", "specialHardware"]) {
      if (k in bersih && (bersih[k] === "" || bersih[k] === null)) {
        bersih[k] = null;
      }
    }

    data.hmi[idx] = { ...data.hmi[idx], ...bersih };
    await writeData(data);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, computer: data.hmi[idx] });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal menyimpan.",
    });
  }
}
