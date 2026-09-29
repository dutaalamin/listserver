"use client";

import { useMemo, useState } from "react";
import { Search, X, Camera, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export interface SpekFoto {
  /** Kode singkat, juga nama file tanpa ekstensi di public/spek/ */
  kode: string;
  hostname: string;
  ip: string;
  /** Keterangan singkat model PC */
  model: string;
}

const DAFTAR: SpekFoto[] = [
  { kode: "hmi28", hostname: "KP1HMI28", ip: "172.21.86.143", model: "HP Desktop M01-F2xxx" },
  { kode: "hmi78", hostname: "KP1HMI78", ip: "172.21.86.166", model: "HP EliteDesk 800 G1 SFF" },
  { kode: "hmi82", hostname: "KP1HMI82", ip: "172.21.86.170", model: "HP EliteDesk 800 G1 SFF" },
  { kode: "hmi79", hostname: "KP1HMI79", ip: "172.21.86.167", model: "HP EliteDesk 800 G1 SFF" },
  { kode: "tlka0t4", hostname: "DESKTOP-TLKA0T4", ip: "172.21.86.168", model: "HP 280 G3 MT" },
];

const urlFoto = (kode: string) => `${import.meta.env.BASE_URL}spek/${kode}.jpg`;

export function SpekFotoGaleri() {
  const [q, setQ] = useState("");
  const [buka, setBuka] = useState<number | null>(null);

  const hasil = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DAFTAR;
    return DAFTAR.filter(
      (f) =>
        f.hostname.toLowerCase().includes(s) ||
        f.ip.includes(s) ||
        f.model.toLowerCase().includes(s)
    );
  }, [q]);

  function geser(arah: number) {
    setBuka((i) => {
      if (i === null) return i;
      const n = (i + arah + hasil.length) % hasil.length;
      return n;
    });
  }

  return (
    <div>
      {/* Pencarian */}
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
        <p className="text-[13px] text-slate-500">
          <span className="font-semibold text-slate-700">{hasil.length}</span> foto
          spesifikasi PC
        </p>
      </div>

      {/* Grid */}
      {hasil.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Camera size={26} className="text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">Foto tidak ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hasil.map((f) => {
            const idx = hasil.indexOf(f);
            return (
              <button
                key={f.kode}
                onClick={() => setBuka(idx)}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                  <img
                    src={urlFoto(f.kode)}
                    alt={`Spesifikasi ${f.hostname}`}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    Spek PC
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold text-slate-900">{f.hostname}</p>
                  <p className="mt-0.5 text-[12.5px] tabular-nums text-slate-500">{f.ip}</p>
                  <p className="mt-1 truncate text-[12px] text-slate-400">{f.model}</p>
                </div>
              </button>
            );
          })}
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
                href={urlFoto(hasil[buka].kode)}
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
              src={urlFoto(hasil[buka].kode)}
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
