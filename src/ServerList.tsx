"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORY_ORDER, filterServers, type Server } from "./lib";

export function ServerList({ servers }: { servers: Server[] }) {
  const [q, setQ] = useState("");

  const hasil = useMemo(() => filterServers(servers, q), [servers, q]);

  // Kategori yang masih ada isinya, urut sesuai CATEGORY_ORDER.
  const kategoriAktif = useMemo(() => {
    const ada = new Set(hasil.map((s) => s.category));
    return CATEGORY_ORDER.filter((c) => ada.has(c));
  }, [hasil]);

  return (
    <div className="space-y-5">
      {/* Pencarian */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
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
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{hasil.length}</span> dari{" "}
          {servers.length} server
        </p>
      </div>

      {/* Per kategori */}
      {kategoriAktif.map((cat) => {
        const items = hasil.filter((s) => s.category === cat);
        return (
          <div key={cat} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              {cat} ({items.length})
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="w-1/4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Client
                      </th>
                      <th className="w-1/3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        IP Address
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((s) => (
                      <tr key={s.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-4 py-3 font-mono font-semibold tabular-nums text-slate-700">
                          {s.ipAddress}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{s.location}</td>
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
