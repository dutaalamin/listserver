/**
 * Vercel Serverless Function — sajikan gambar dari Vercel Blob (private).
 *
 * Karena store Blob bersifat PRIVATE, gambar tidak bisa diakses langsung
 * lewat URL blob. Fungsi ini bertindak sebagai jembatan:
 *   GET /api/gambar?p=spek/xxx.jpg  ->  alirkan isi file
 *
 * Aman: hanya menerima pathname di dalam folder "spek/".
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { get } from "@vercel/blob";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  const p = String(req.query?.p ?? "");
  // Validasi: wajib di folder spek/, tanpa naik direktori
  if (!p.startsWith("spek/") || p.includes("..")) {
    return res.status(400).json({ error: "Path tidak valid." });
  }

  try {
    const hasil = await get(p, { access: "private" });
    if (!hasil || hasil.statusCode !== 200 || !hasil.stream) {
      return res.status(404).json({ error: "Gambar tidak ditemukan." });
    }

    const buf = Buffer.from(await new Response(hasil.stream).arrayBuffer());
    const tipe =
      (hasil.blob as { contentType?: string } | undefined)?.contentType ||
      "image/jpeg";

    res.setHeader("Content-Type", tipe);
    res.setHeader("Content-Length", String(buf.length));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(buf);
  } catch {
    return res.status(404).json({ error: "Gambar tidak ditemukan." });
  }
}
