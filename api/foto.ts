/**
 * Vercel Serverless Function — kelola galeri "Foto Spek PC".
 *
 * Body (POST, JSON):
 *   { password, action: "list" }
 *   { password, action: "add", foto: { nama, hostname, ip, model, gambarBase64, mime } }
 *   { password, action: "update", id, patch: { hostname, ip, model, nama } }
 *   { password, action: "delete", id }
 *
 * Balasan: { ok, foto: [...] }
 *
 * Foto disimpan di Vercel Blob (public) supaya bisa ditampilkan di <img>.
 * Metadata (hostname/ip/model) disimpan di portal/data.json.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { get, put, del } from "@vercel/blob";

const PATHNAME = "portal/data.json";
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB per gambar
const IZIN_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export interface SpekFoto {
  id: string;
  nama: string; // nama file di blob
  url: string; // URL publik gambar
  hostname: string;
  ip: string;
  model: string;
  waktu: number;
}

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

async function readData(): Promise<Record<string, unknown>> {
  const res = await get(PATHNAME, { access: "private", useCache: false });
  if (res?.statusCode === 200 && res.stream) {
    const text = await new Response(res.stream).text();
    return JSON.parse(text);
  }
  throw new Error("Data belum tersedia. Buka tab List Server dulu.");
}

async function writeData(data: unknown) {
  await put(PATHNAME, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Daftar foto statis yang ada di /public/spek (tidak disimpan di blob). */
function staticList(): SpekFoto[] {
  // Migrasi awal: 5 foto lama yang tersimpan sebagai file statis di /public/spek
  const lama: Array<[string, string, string, string]> = [
    ["hmi28", "KP1HMI28", "172.21.86.143", "HP Desktop M01-F2xxx"],
    ["hmi78", "KP1HMI78", "172.21.86.166", "HP EliteDesk 800 G1 SFF"],
    ["hmi82", "KP1HMI82", "172.21.86.170", "HP EliteDesk 800 G1 SFF"],
    ["hmi79", "KP1HMI79", "172.21.86.167", "HP EliteDesk 800 G1 SFF"],
    ["tlka0t4", "DESKTOP-TLKA0T4", "172.21.86.168", "HP 280 G3 MT"],
  ];
  const dasar = lama.map(([kode, hostname, ip, model], i) => ({
    id: `statik-${kode}`,
    nama: `spek/${kode}.jpg`,
    url: `/spek/${kode}.jpg`,
    hostname,
    ip,
    model,
    waktu: i,
  }));

  // Foto HMI hasil dokumentasi lapangan (statis, ada di /public/spek).
  const lapangan: SpekFoto[] = Array.from({ length: 22 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `statik-spek-${n}`,
      nama: `spek/spek-${n}.png`,
      url: `/spek/spek-${n}.png`,
      hostname: `HMI-${n}`,
      ip: "",
      model: "",
      waktu: 100 + i,
    };
  });

  return [...dasar, ...lapangan];
}

/** Foto yang tersimpan (hasil unggahan) — tanpa foto statis. */
function storedList(data: Record<string, unknown>): SpekFoto[] {
  const d = data.spekFoto;
  return Array.isArray(d) ? (d as SpekFoto[]) : [];
}

/** Id foto statis yang disembunyikan (dihapus user). */
function hiddenIds(data: Record<string, unknown>): string[] {
  const d = data.spekHidden;
  return Array.isArray(d) ? (d as string[]) : [];
}

/** Perubahan metadata untuk foto statis (hostname/ip/model). */
function overrides(data: Record<string, unknown>): Record<string, Partial<SpekFoto>> {
  const d = data.spekEdit;
  return d && typeof d === "object" ? (d as Record<string, Partial<SpekFoto>>) : {};
}

/** Gabungan: unggahan dulu, lalu foto statis (yang belum disembunyikan). */
function ambilDaftar(data: Record<string, unknown>): SpekFoto[] {
  const hidden = new Set(hiddenIds(data));
  const ov = overrides(data);
  return [...storedList(data), ...staticList()]
    .filter((f) => !hidden.has(f.id))
    .map((f) => (ov[f.id] ? { ...f, ...ov[f.id] } : f));
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

  const action = String(req.body?.action ?? "list");

  // "list" bersifat PUBLIK (halaman bisa dilihat tanpa password).
  // add / update / delete tetap WAJIB password.
  if (action !== "list") {
    const expected = process.env.ACCESS_PASSWORD;
    if (!expected) {
      return res.status(500).json({ error: "Server belum dikonfigurasi." });
    }
    const password = String(req.body?.password ?? "");
    if (!password || !safeEqual(password, expected)) {
      noteFailure(ip);
      return res.status(401).json({ error: "Password salah." });
    }
  }

  try {
    const data = await readData();

    // ---------- LIST ----------
    if (action === "list") {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
    }

    // ---------- ADD ----------
    if (action === "add") {
      const f = (req.body?.foto ?? {}) as Record<string, unknown>;
      const hostname = String(f.hostname ?? "").trim();
      const ipAddr = String(f.ip ?? "").trim();
      const model = String(f.model ?? "").trim();
      const gambar = String(f.gambarBase64 ?? "");
      const mime = String(f.mime ?? "image/jpeg");

      if (!hostname) {
        return res.status(400).json({ error: "Hostname wajib diisi." });
      }
      if (!gambar) {
        return res.status(400).json({ error: "Gambar wajib diunggah." });
      }
      if (!IZIN_MIME.includes(mime)) {
        return res
          .status(400)
          .json({ error: "Format gambar harus JPG, PNG, atau WEBP." });
      }

      const buf = Buffer.from(gambar, "base64");
      if (buf.length > MAX_BYTES) {
        return res.status(413).json({ error: "Ukuran gambar maksimal 6 MB." });
      }

      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const namaFile = `spek/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      await put(namaFile, buf, {
        access: "private",
        addRandomSuffix: false,
        contentType: mime,
      });

      const daftar = storedList(data);
      const baru: SpekFoto = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nama: namaFile,
        // Store privat -> gambar disajikan lewat /api/gambar
        url: `/api/gambar?p=${encodeURIComponent(namaFile)}`,
        hostname,
        ip: ipAddr,
        model,
        waktu: Date.now(),
      };
      data.spekFoto = [baru, ...daftar];
      await writeData(data);

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
    }

    // ---------- UPDATE ----------
    if (action === "update") {
      const id = String(req.body?.id ?? "");
      const patch = (req.body?.patch ?? {}) as Record<string, unknown>;
      const ambil = (k: string) => String(patch[k] ?? "").trim();

      // Foto statis -> simpan perubahan sebagai override.
      if (staticList().some((x) => x.id === id)) {
        const ov = overrides(data);
        const lama = ov[id] ?? {};
        const baru = { ...lama };
        if ("hostname" in patch) baru.hostname = ambil("hostname");
        if ("ip" in patch) baru.ip = ambil("ip");
        if ("model" in patch) baru.model = ambil("model");
        ov[id] = baru;
        data.spekEdit = ov;
        await writeData(data);
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
      }

      const daftar = storedList(data);
      const idx = daftar.findIndex((x) => x.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Foto tidak ditemukan." });
      }
      const baru = { ...daftar[idx] };
      if ("hostname" in patch) baru.hostname = ambil("hostname");
      if ("ip" in patch) baru.ip = ambil("ip");
      if ("model" in patch) baru.model = ambil("model");
      daftar[idx] = baru;
      data.spekFoto = daftar;
      await writeData(data);

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
    }

    // ---------- DELETE ----------
    if (action === "delete") {
      const id = String(req.body?.id ?? "");
      const statis = staticList().find((x) => x.id === id);

      // Foto statis (ada di repo) -> cukup "sembunyikan" dengan mencatat id-nya.
      if (statis) {
        const hidden = hiddenIds(data);
        if (!hidden.includes(id)) hidden.push(id);
        data.spekHidden = hidden;
        await writeData(data);
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
      }

      // Foto unggahan -> hapus file blob + metadatanya.
      const daftar = storedList(data);
      const target = daftar.find((x) => x.id === id);
      if (!target) {
        return res.status(404).json({ error: "Foto tidak ditemukan." });
      }
      try {
        await del(target.nama);
      } catch {
        /* kalau blob sudah tidak ada, lanjut hapus metadata */
      }
      data.spekFoto = daftar.filter((x) => x.id !== id);
      await writeData(data);

      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ ok: true, foto: ambilDaftar(data) });
    }

    return res.status(400).json({ error: "Aksi tidak dikenal." });
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Gagal memproses permintaan.",
    });
  }
}
