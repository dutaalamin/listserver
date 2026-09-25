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
import { clientIp, noteFailure, rateLimited, safeEqual } from "./_auth";
import { pickEditable, readData, writeData } from "./_store";

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
    const data = await readData();
    const idx = data.hmi.findIndex((c) => Number(c.no) === no);
    if (idx === -1) {
      return res.status(404).json({ error: `Komputer #${no} tidak ditemukan.` });
    }

    const bersih = pickEditable(patch as Record<string, unknown>);
    if (Object.keys(bersih).length === 0) {
      return res.status(400).json({ error: "Tidak ada field yang bisa diubah." });
    }

    // Normalisasi angka untuk field numerik
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
