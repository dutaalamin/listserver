/**
 * Vercel Serverless Function — tambah / hapus komputer HMI.
 *
 * Body:
 *   { password, action: "add", computer: { ...field } }
 *   { password, action: "delete", no }
 *
 * Balasan: { ok, hmi }  (seluruh daftar HMI terbaru)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { get, put } from "@vercel/blob";

const PATHNAME = "portal/data.json";

const EDITABLE = [
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

const ANGKA = ["usbQty", "usbUsage", "osBlock", "diskQty"];
const OPSIONAL = ["mac2", "specialSoftware", "specialHardware"];

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

  const action = String(req.body?.action ?? "add");

  try {
    const data = (await readData()) as {
      servers: unknown[];
      hmi: Record<string, unknown>[];
    };

    if (action === "delete") {
      const no = Number(req.body?.no);
      const sebelum = data.hmi.length;
      data.hmi = data.hmi.filter((c) => Number(c.no) !== no);
      if (data.hmi.length === sebelum) {
        return res.status(404).json({ error: `Komputer #${no} tidak ditemukan.` });
      }
    } else {
      const src = (req.body?.computer ?? {}) as Record<string, unknown>;

      const bersih: Record<string, unknown> = {};
      for (const k of EDITABLE) {
        if (k in src) bersih[k] = src[k];
      }

      // Field wajib
      if (!String(bersih.hostname ?? "").trim()) {
        return res.status(400).json({ error: "Hostname wajib diisi." });
      }
      if (!String(bersih.ip ?? "").trim()) {
        return res.status(400).json({ error: "IP Address wajib diisi." });
      }

      // Normalisasi angka (default 0)
      for (const k of ANGKA) {
        const n = Number(bersih[k]);
        bersih[k] = Number.isFinite(n) ? n : 0;
      }
      // Opsional kosong -> null
      for (const k of OPSIONAL) {
        if (bersih[k] === "" || bersih[k] === undefined) bersih[k] = null;
      }

      // no baru = terbesar + 1
      const maxNo = data.hmi.reduce((m, c) => Math.max(m, Number(c.no) || 0), 0);
      data.hmi.push({ no: maxNo + 1, ...bersih });
    }

    await writeData(data);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, hmi: data.hmi });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal menyimpan.",
    });
  }
}
