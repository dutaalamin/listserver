"use client";

import { useMemo, useState } from "react";
import {
  Search, X, SlidersHorizontal, Download, ArrowLeft,
  Monitor, Cpu, HardDrive, Usb, Shield, Wrench,
} from "lucide-react";
import {
  filterComputers, uniqueValues, EMPTY_HMI_FILTERS,
  type Computer, type HmiFilters,
} from "./lib";

const osTone = () => "bg-slate-100 text-slate-700";

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className ?? "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}


export function HmiPanel({ computers }: { computers: Computer[] }) {
  const [filters, setFilters] = useState<HmiFilters>(EMPTY_HMI_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const [detail, setDetail] = useState<Computer | null>(null);

  const osOptions = useMemo(() => uniqueValues(computers, (c) => c.osVersion), [computers]);
  const modelOptions = useMemo(() => uniqueValues(computers, (c) => c.computer), [computers]);
  const diskOptions = useMemo(() => uniqueValues(computers, (c) => c.diskType), [computers]);
  const hasil = useMemo(() => filterComputers(computers, filters), [computers, filters]);

  const set = <K extends keyof HmiFilters>(k: K, v: HmiFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  /** Kelompokkan hasil per ruangan, urut sesuai kemunculan pertama. */
  const grup = useMemo(() => {
    const map = new Map<string, Computer[]>();
    for (const c of hasil) {
      const key = c.room ?? "LAIN-LAIN";
      const arr = map.get(key);
      if (arr) arr.push(c);
      else map.set(key, [c]);
    }
    return [...map.entries()];
  }, [hasil]);

  const adaFilter = Boolean(
    filters.q || filters.osVersion || filters.computer || filters.diskType || filters.feature,
  );

  function exportCsv() {
    const headers = [
      "No", "Lokasi", "Ruangan", "Hostname", "Username", "Password", "IP Address",
      "MAC 1", "MAC 2", "Komputer", "Display Output",
      "Monitor", "Display Input", "USB Qty", "USB Usage", "OS Block", "Antivirus",
      "OS", "Framework", "Disk Qty", "Disk Type", "Disk Capacity", "Software Khusus", "Hardware Khusus",
    ];
    const rows = hasil.map((c) => [
      c.no, c.location ?? "", c.room ?? "", c.hostname ?? "", c.username ?? "",
      c.password, c.ip, c.mac1, c.mac2 ?? "", c.computer, c.displayOutput,
      c.monitor, c.monitorInput, c.usbQty, c.usbUsage, c.osBlock, c.antivirus,
      c.osVersion, c.framework, c.diskQty, c.diskType, c.diskCapacity,
      c.specialSoftware ?? "", c.specialHardware ?? "",
    ]);
    const cell = (v: unknown) => {
      const t = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventaris-komputer.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";

  // ============================ Detail ============================
  if (detail) {
    const rows: { label: string; value: string; mono?: boolean }[] = [
      { label: "Lokasi", value: detail.location ?? "—" },
      { label: "Ruangan", value: detail.room ?? "—" },
      { label: "Hostname", value: detail.hostname ?? "—", mono: true },
      { label: "Username", value: detail.username ?? "—", mono: true },
      { label: "Password", value: detail.password, mono: true },
      { label: "IP Address", value: detail.ip, mono: true },
      { label: "MAC Address #1", value: detail.mac1, mono: true },
      { label: "MAC Address #2", value: detail.mac2 ?? "—", mono: true },
      { label: "Komputer / CPU", value: detail.computer },
      { label: "Display Output", value: detail.displayOutput },
      { label: "Monitor", value: detail.monitor },
      { label: "Display Input", value: detail.monitorInput },
      { label: "Jumlah USB", value: `${detail.usbQty} port` },
      { label: "USB Terpakai", value: `${detail.usbUsage} port` },
      { label: "OS Block", value: String(detail.osBlock) },
      { label: "Antivirus", value: detail.antivirus },
      { label: "Sistem Operasi", value: detail.osVersion },
      { label: "Framework", value: detail.framework },
      { label: "Jumlah Disk", value: `${detail.diskQty} unit` },
      { label: "Jenis Disk", value: detail.diskType },
      { label: "Kapasitas Disk", value: detail.diskCapacity },
      { label: "Software Khusus", value: detail.specialSoftware ?? "—" },
      { label: "Hardware Khusus", value: detail.specialHardware ?? "—" },
    ];

    return (
      <div className="space-y-5">
        <button
          onClick={() => setDetail(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Kembali ke daftar
        </button>
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Komputer #{detail.no}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {detail.ip}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{detail.computer}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={osTone()}>{detail.osVersion}</Badge>
              {detail.specialHardware === "KVM" && (
                <Badge className="bg-slate-100 text-slate-700">KVM</Badge>
              )}
              {detail.mac2 && <Badge className="bg-slate-100 text-slate-700">2 Kabel LAN</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Cpu size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Processor / PC</p>
                <p className="text-sm font-semibold text-slate-800">{detail.computer}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <HardDrive size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Penyimpanan</p>
                <p className="text-sm font-semibold text-slate-800">
                  {detail.diskType} · {detail.diskCapacity}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Monitor size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Monitor</p>
                <p className="text-sm font-semibold text-slate-800">{detail.monitor}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Wrench size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">Spesifikasi Lengkap</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {rows.map((r) => (
                <div key={r.label} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <span className="text-[12px] text-slate-500 sm:text-[13px]">{r.label}</span>
                  <span
                    className={`text-[13px] font-medium text-slate-800 sm:text-right ${
                      r.mono ? "font-mono tabular-nums" : ""
                    }`}
                  >
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Usb size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Port USB</p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {detail.usbQty} port tersedia, {detail.usbUsage} terpakai
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Shield size={19} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Keamanan</p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Antivirus {detail.antivirus} · Framework {detail.framework}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pb-4">
            {detail.no > 1 ? (
              <button
                onClick={() => setDetail(computers.find((c) => c.no === detail.no - 1) ?? null)}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                ← #{detail.no - 1}
              </button>
            ) : <span />}
            {detail.no < computers.length ? (
              <button
                onClick={() => setDetail(computers.find((c) => c.no === detail.no + 1) ?? null)}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                #{detail.no + 1} →
              </button>
            ) : <span />}
          </div>
        </div>
      </div>
    );
  }

  // ============================ Daftar ============================
  return (
    <div className="space-y-5">
        {/* Pencarian */}
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Cari IP, MAC, model, monitor, OS…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
            />
            {filters.q && (
              <button
                onClick={() => set("q", "")}
                aria-label="Bersihkan"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilter((v) => !v)}
              className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-medium transition sm:flex-none ${
                showFilter || adaFilter
                  ? "border-slate-400 bg-slate-100 text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal size={16} />
              Filter
            </button>

            <button
              onClick={exportCsv}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none"
            >
              <Download size={16} />
              Ekspor CSV
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Sistem Operasi</label>
              <select value={filters.osVersion} onChange={(e) => set("osVersion", e.target.value)} className={selectCls}>
                <option value="">Semua</option>
                {osOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Model Komputer</label>
              <select value={filters.computer} onChange={(e) => set("computer", e.target.value)} className={selectCls}>
                <option value="">Semua</option>
                {modelOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Jenis Disk</label>
              <select value={filters.diskType} onChange={(e) => set("diskType", e.target.value)} className={selectCls}>
                <option value="">Semua</option>
                {diskOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Fitur Khusus</label>
              <select value={filters.feature} onChange={(e) => set("feature", e.target.value)} className={selectCls}>
                <option value="">Semua</option>
                <option value="kvm">Pakai KVM</option>
                <option value="dual-lan">2 Kabel LAN</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{hasil.length}</span> dari {computers.length} komputer
          </p>
          {adaFilter && (
            <button
              onClick={() => setFilters(EMPTY_HMI_FILTERS)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-900"
            >
              <X size={13} />
              Reset filter
            </button>
          )}
        </div>

        {grup.map(([ruangan, items]) => (
          <div key={ruangan} className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900">
              {ruangan} ({items.length})
            </h2>

            {/* Mobile: kartu */}
            <div className="space-y-2 md:hidden">
              {items.map((c) => (
                <div key={c.no} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {c.hostname ?? "—"}
                      </p>
                      <p className="truncate font-mono text-[12px] text-slate-500">
                        {c.username ?? "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetail(c)}
                      className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-slate-900 underline decoration-slate-300 underline-offset-2"
                    >
                      {c.ip}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
                    <span>{c.computer}</span>
                    <span>{c.osVersion}</span>
                    <span>{c.diskType} {c.diskCapacity}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {c.specialHardware === "KVM" && <Badge>KVM</Badge>}
                    {c.mac2 && <Badge>2 LAN</Badge>}
                    <button
                      onClick={() => setDetail(c)}
                      className="ml-auto text-xs font-medium text-slate-500"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:block">
              <div className="w-full overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-[13px]" style={{ minWidth: 1320 }}>
                  <colgroup>
                    <col style={{ width: 50 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 145 }} />
                    <col style={{ width: 185 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 175 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 75 }} />
                    <col style={{ width: 60 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["No", "Hostname", "Username", "IP Address", "MAC Address", "Komputer", "Monitor", "OS", "Disk", "Fitur", ""].map((h, i) => (
                        <th
                          key={h + i}
                          className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                            i === 10 ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((c) => (
                      <tr key={c.no} className="transition hover:bg-slate-50">
                        <td className="truncate px-3 py-3 tabular-nums text-slate-400">{c.no}</td>
                        <td className="truncate px-3 py-3 font-semibold text-slate-900">{c.hostname ?? "—"}</td>
                        <td className="truncate px-3 py-3 font-mono text-[12px] text-slate-600">
                          {c.username ?? "—"}
                        </td>
                        <td className="truncate px-3 py-3">
                          <button
                            onClick={() => setDetail(c)}
                            className="font-medium tabular-nums text-slate-900 hover:underline"
                          >
                            {c.ip}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="truncate font-mono text-[12px] tabular-nums text-slate-600">
                            {c.mac1}
                            {c.mac2 && <div className="truncate text-slate-400">{c.mac2}</div>}
                          </div>
                        </td>
                        <td className="truncate px-3 py-3 font-medium text-slate-800">{c.computer}</td>
                        <td className="px-3 py-3 text-slate-600">
                          <div className="truncate">{c.monitor}</div>
                          <div className="truncate text-[11px] text-slate-400">{c.displayOutput} → {c.monitorInput}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge className={osTone()}>{c.osVersion}</Badge>
                        </td>
                        <td className="truncate px-3 py-3 text-slate-600">
                          {c.diskType}
                          <div className="truncate text-[11px] text-slate-400">{c.diskCapacity}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {c.specialHardware === "KVM" && <Badge className="bg-slate-100 text-slate-700">KVM</Badge>}
                            {c.mac2 && <Badge className="bg-slate-100 text-slate-900">2 LAN</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            onClick={() => setDetail(c)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {hasil.length === 0 && (
          <div className="py-20 text-center text-sm italic text-slate-400">
            Tidak ada komputer yang cocok dengan pencarian.
          </div>
        )}

    </div>
  );
}
