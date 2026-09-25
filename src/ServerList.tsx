"use client";

import { useMemo, useState } from "react";
import { Search, X, Plus, Pencil, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { CATEGORY_ORDER, filterServers, type Server } from "./lib";
import { deleteServer, saveServer, type ServerItem } from "./api";

type Draft = { id?: number; name: string; ipAddress: string; location: string; category: string };

const KOSONG: Draft = { name: "", ipAddress: "", location: "", category: "" };

export function ServerList({
  servers,
  password,
  onChanged,
}: {
  servers: Server[];
  password: string;
  onChanged: (list: ServerItem[]) => void;
}) {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState<{ tipe: "ok" | "err"; teks: string } | null>(null);

  const hasil = useMemo(() => filterServers(servers, q), [servers, q]);

  const kategoriAktif = useMemo(() => {
    const ada = new Set(hasil.map((s) => s.category));
    const urut = CATEGORY_ORDER.filter((c) => ada.has(c));
    // kategori di luar daftar tetap ditampilkan
    const lain = [...ada].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...urut, ...lain];
  }, [hasil]);

  const kategoriOpsi = useMemo(() => {
    const ada = new Set(servers.map((s) => s.category));
    const urut = CATEGORY_ORDER.filter((c) => ada.has(c));
    const lain = [...ada].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...urut, ...lain];
  }, [servers]);

  async function simpan() {
    if (!edit) return;
    setSaving(true);
    setPesan(null);
    try {
      const list = await saveServer(password, edit);
      onChanged(list);
      setEdit(null);
      setPesan({ tipe: "ok", teks: "Server tersimpan." });
    } catch (err) {
      setPesan({ tipe: "err", teks: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setSaving(false);
    }
  }

  async function hapus(s: Server) {
    if (!confirm(`Hapus "${s.name}" (${s.ipAddress})?`)) return;
    setSaving(true);
    setPesan(null);
    try {
      const list = await deleteServer(password, s.id);
      onChanged(list);
      setPesan({ tipe: "ok", teks: "Server dihapus." });
    } catch (err) {
      setPesan({ tipe: "err", teks: err instanceof Error ? err.message : "Gagal menghapus." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  return (
    <div className="space-y-5">
      {/* Pencarian + Tambah */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari client, IP, lokasi…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Bersihkan"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setEdit({ ...KOSONG });
              setPesan(null);
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Tambah Server</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{hasil.length}</span> dari{" "}
          {servers.length} server
        </p>
      </div>

      {pesan && (
        <div
          role="alert"
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] ${
            pesan.tipe === "ok"
              ? "border-slate-300 bg-slate-100 text-slate-800"
              : "border-slate-400 bg-slate-200 text-slate-900"
          }`}
        >
          {pesan.tipe === "ok" ? <Check size={15} /> : <AlertCircle size={15} />}
          {pesan.teks}
        </div>
      )}

      {/* Form tambah/edit */}
      {edit && (
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Pencil size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              {edit.id ? `Edit Server #${edit.id}` : "Tambah Server Baru"}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">Client</label>
              <input
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="mis. HMI01"
                className={`${inputCls} font-semibold`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">IP Address</label>
              <input
                value={edit.ipAddress}
                onChange={(e) => setEdit({ ...edit, ipAddress: e.target.value })}
                placeholder="mis. 172.21.86.131"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">Kategori</label>
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                placeholder="mis. SHEARING"
                list="kategori-list"
                className={inputCls}
              />
              <datalist id="kategori-list">
                {kategoriOpsi.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-slate-500">Location</label>
              <input
                value={edit.location}
                onChange={(e) => setEdit({ ...edit, location: e.target.value })}
                placeholder="mis. Computer Room"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
            <button
              onClick={() => setEdit(null)}
              disabled={saving}
              className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={simpan}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* Per kategori */}
      {kategoriAktif.map((cat) => {
        const items = hasil.filter((s) => s.category === cat);
        return (
          <div key={cat} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              {cat} ({items.length})
            </h2>

            {/* Mobile: kartu */}
            <div className="space-y-2 md:hidden">
              {items.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-700">
                      {s.ipAddress}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-500">{s.location}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEdit({ id: s.id, name: s.name, ipAddress: s.ipAddress, location: s.location, category: s.category });
                        setPesan(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => hapus(s)}
                      disabled={saving}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:block">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "21%" }} />
                    <col style={{ width: "43%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Client
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        IP Address
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Location
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((s) => (
                      <tr key={s.id} className="transition hover:bg-slate-50">
                        <td className="truncate px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="truncate px-4 py-3 font-mono font-semibold tabular-nums text-slate-700">
                          {s.ipAddress}
                        </td>
                        <td className="truncate px-4 py-3 text-slate-600">{s.location}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEdit({ id: s.id, name: s.name, ipAddress: s.ipAddress, location: s.location, category: s.category });
                                setPesan(null);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              onClick={() => hapus(s)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-900 disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {hasil.length === 0 && (
        <div className="py-20 text-center text-sm italic text-slate-400">
          Tidak ada hasil yang cocok.
        </div>
      )}
    </div>
  );
}
