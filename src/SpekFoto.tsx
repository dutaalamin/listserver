"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import {
  listFoto,
  addFoto,
  updateFoto,
  deleteFoto,
  type SpekFotoItem,
} from "./api";

type Pesan = { tipe: "ok" | "err"; teks: string } | null;

/** Baca file jadi base64 (tanpa prefix data URL). */
function bacaBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const hasil = String(fr.result ?? "");
      const koma = hasil.indexOf(",");
      resolve({ base64: koma >= 0 ? hasil.slice(koma + 1) : hasil, mime: file.type });
    };
    fr.onerror = () => reject(new Error("Gagal membaca file."));
    fr.readAsDataURL(file);
  });
}

/** Perkecil gambar di browser supaya unggahan ringan. */
async function kompres(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const MAX = 1600;
  const skala = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * skala);
  const h = Math.round(bitmap.height * skala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((r) =>
    canvas.toBlob((b) => r(b), "image/jpeg", 0.82),
  );
  if (!blob) return file;
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

export function SpekFotoGaleri({
  password,
  canEdit,
  onRequestUnlock,
}: {
  password: string;
  canEdit: boolean;
  onRequestUnlock: () => void;
}) {
  const [daftar, setDaftar] = useState<SpekFotoItem[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [q, setQ] = useState("");
  const [buka, setBuka] = useState<number | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);

  // form tambah
  const [tambahBuka, setTambahBuka] = useState(false);
  const [hostname, setHostname] = useState("");
  const [ip, setIp] = useState("");
  const [model, setModel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [kirim, setKirim] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // edit
  const [edit, setEdit] = useState<SpekFotoItem | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const list = await listFoto(password);
      setDaftar(list);
    } catch (err) {
      setPesan({
        tipe: "err",
        teks: err instanceof Error ? err.message : "Gagal memuat foto.",
      });
    } finally {
      setMemuat(false);
    }
  }, [password]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return daftar;
    return daftar.filter(
      (f) =>
        f.hostname.toLowerCase().includes(s) ||
        f.ip.includes(s) ||
        f.model.toLowerCase().includes(s),
    );
  }, [daftar, q]);

  function pilihFile(f: File | null) {
    setFile(f);
    if (pratinjau) URL.revokeObjectURL(pratinjau);
    setPratinjau(f ? URL.createObjectURL(f) : null);
  }

  function resetForm() {
    setHostname("");
    setIp("");
    setModel("");
    pilihFile(null);
    setTambahBuka(false);
  }

  async function simpanBaru() {
    if (!hostname.trim()) return setPesan({ tipe: "err", teks: "Hostname wajib diisi." });
    if (!file) return setPesan({ tipe: "err", teks: "Pilih foto terlebih dahulu." });
    setKirim(true);
    setPesan(null);
    try {
      const kecil = await kompres(file);
      const { base64, mime } = await bacaBase64(kecil);
      const list = await addFoto(password, {
        hostname: hostname.trim(),
        ip: ip.trim(),
        model: model.trim(),
        gambarBase64: base64,
        mime: mime || "image/jpeg",
      });
      setDaftar(list);
      resetForm();
      setPesan({ tipe: "ok", teks: "Foto berhasil ditambahkan." });
    } catch (err) {
      setPesan({
        tipe: "err",
        teks: err instanceof Error ? err.message : "Gagal mengunggah.",
      });
    } finally {
      setKirim(false);
    }
  }

  async function simpanEdit() {
    if (!edit) return;
    setKirim(true);
    setPesan(null);
    try {
      const list = await updateFoto(password, edit.id, {
        hostname: edit.hostname,
        ip: edit.ip,
        model: edit.model,
      });
      setDaftar(list);
      setEdit(null);
      setPesan({ tipe: "ok", teks: "Data foto diperbarui." });
    } catch (err) {
      setPesan({
        tipe: "err",
        teks: err instanceof Error ? err.message : "Gagal menyimpan.",
      });
    } finally {
      setKirim(false);
    }
  }

  async function hapus(f: SpekFotoItem) {
    if (!confirm(`Hapus foto "${f.hostname}"?`)) return;
    setPesan(null);
    try {
      const list = await deleteFoto(password, f.id);
      setDaftar(list);
      setPesan({ tipe: "ok", teks: "Foto dihapus." });
    } catch (err) {
      setPesan({
        tipe: "err",
        teks: err instanceof Error ? err.message : "Gagal menghapus.",
      });
    }
  }

  function geser(arah: number) {
    setBuka((i) => {
      if (i === null) return i;
      return (i + arah + hasil.length) % hasil.length;
    });
  }

  return (
    <div>
      {/* Bar atas */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari hostname / IP / model…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Bersihkan"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[13px] text-slate-500 sm:block">
            <span className="font-semibold text-slate-700">{hasil.length}</span> foto
          </p>
          <button
            onClick={() => (canEdit ? setTambahBuka((v) => !v) : onRequestUnlock())}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={15} />
            Tambah Foto
          </button>
        </div>
      </div>

      {/* Pesan */}
      {pesan && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] ${
            pesan.tipe === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <AlertCircle size={15} />
          {pesan.teks}
        </div>
      )}

      {/* Form tambah */}
      {tambahBuka && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Tambah Foto Spek PC
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="Hostname (wajib) *"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP Address"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model PC"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pilihFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-[13px] font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
            >
              <UploadCloud size={16} />
              {file ? file.name : "Pilih gambar…"}
            </button>
            {pratinjau && (
              <img
                src={pratinjau}
                alt="Pratinjau"
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
              />
            )}
            <div className="flex-1" />
            <button
              onClick={resetForm}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              onClick={simpanBaru}
              disabled={kirim}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {kirim ? <Loader2 size={15} className="animate-spin" /> : null}
              Unggah
            </button>
          </div>
          <p className="mt-2 text-[11.5px] text-slate-400">
            Gambar otomatis diperkecil sebelum diunggah. Maksimal 6 MB.
          </p>
        </div>
      )}

      {/* Grid */}
      {memuat ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : hasil.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Camera size={26} className="text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            {daftar.length === 0
              ? "Belum ada foto. Klik “Tambah Foto”."
              : "Foto tidak ditemukan."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map((f) => {
            const idx = hasil.indexOf(f);
            return (
              <div
                key={f.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md"
              >
                <button
                  onClick={() => setBuka(idx)}
                  className="relative block aspect-[3/4] w-full overflow-hidden bg-slate-100"
                >
                  <img
                    src={f.url}
                    alt={`Spesifikasi ${f.hostname}`}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    Spek PC
                  </span>
                </button>
                <div className="p-3.5">
                  <p className="text-sm font-semibold text-slate-900">{f.hostname}</p>
                  <p className="mt-0.5 text-[12.5px] tabular-nums text-slate-500">
                    {f.ip || "—"}
                  </p>
                  <p className="mt-1 truncate text-[12px] text-slate-400">
                    {f.model || "—"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => (canEdit ? setEdit({ ...f }) : onRequestUnlock())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => (canEdit ? hapus(f) : onRequestUnlock())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal edit */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Edit Data Foto</p>
            <div className="mt-3 flex flex-col gap-3">
              <input
                value={edit.hostname}
                onChange={(e) => setEdit({ ...edit, hostname: e.target.value })}
                placeholder="Hostname"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={edit.ip}
                onChange={(e) => setEdit({ ...edit, ip: e.target.value })}
                placeholder="IP Address"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={edit.model}
                onChange={(e) => setEdit({ ...edit, model: e.target.value })}
                placeholder="Model PC"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEdit(null)}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={simpanEdit}
                disabled={kirim}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {kirim ? <Loader2 size={15} className="animate-spin" /> : null}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {buka !== null && hasil[buka] && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setBuka(null)}
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{hasil[buka].hostname}</p>
              <p className="truncate text-[12px] tabular-nums text-slate-300">
                {hasil[buka].ip} · {hasil[buka].model}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href={hasil[buka].url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Buka gambar asli"
              >
                <ExternalLink size={18} />
              </a>
              <button
                onClick={() => setBuka(null)}
                className="rounded-lg p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            {hasil.length > 1 && (
              <button
                onClick={() => geser(-1)}
                className="absolute left-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
                aria-label="Sebelumnya"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <img
              src={hasil[buka].url}
              alt={`Spesifikasi ${hasil[buka].hostname}`}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {hasil.length > 1 && (
              <button
                onClick={() => geser(1)}
                className="absolute right-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
                aria-label="Berikutnya"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          <p className="pb-4 text-center text-[12px] text-slate-400">
            {buka + 1} / {hasil.length}
          </p>
        </div>
      )}
    </div>
  );
}
