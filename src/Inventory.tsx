"use client";

import { useMemo, useState } from "react";
import {
  Search, X, SlidersHorizontal, Download, ArrowLeft, Monitor,
  Cpu, HardDrive, Usb, Shield, Wrench, LogOut,
} from "lucide-react";
import {
  filterComputers, uniqueValues, summarize, EMPTY_FILTERS,
  type Computer, type Filters,
} from "./lib";

const OS_TONE: Record<string, string> = {
  "WINDOWS 10": "bg-blue-50 text-blue-700",
  "WINDOWS 7": "bg-amber-50 text-amber-700",
  "WINDOWS SERVER 2008": "bg-violet-50 text-violet-700",
};
const osTone = (os: string) => OS_TONE[os] ?? "bg-slate-100 text-slate-600";

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className ?? "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

function Stat({ label, value, icon: Icon, tone, hint }: {
  label: string; value: number | string; icon: typeof Monitor; tone: string; hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={19} strokeWidth={2} />
      </span>
    </div>
  );
}

export function Inventory({ computers, onLogout }: { computers: Computer[]; onLogout: () => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const [detail, setDetail] = useState<Computer | null>(null);

  const osOptions = useMemo(() => uniqueValues(computers, (c) => c.osVersion), [computers]);
  const modelOptions = useMemo(() => uniqueValues(computers, (c) => c.computer), [computers]);
  const diskOptions = useMemo(() => uniqueValues(computers, (c) => c.diskType), [computers]);
  const hasil = useMemo(() => filterComputers(computers, filters), [computers, filters]);
  const s = useMemo(() => summarize(computers), [computers]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const adaFilter = Boolean(
    filters.q || filters.osVersion || filters.computer || filters.diskType || filters.feature,
  );

  function exportCsv() {
    const headers = [
      "No", "Password", "IP Address", "MAC 1", "MAC 2", "Komputer", "Display Output",
      "Monitor", "Display Input", "USB Qty", "USB Usage", "OS Block", "Antivirus",
      "OS", "Framework", "Disk Qty", "Disk Type", "Disk Capacity", "Software Khusus", "Hardware Khusus",
    ];
    const rows = hasil.map((c) => [
      c.no, c.password, c.ip, c.mac1, c.mac2 ?? "", c.computer, c.displayOutput,
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
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  // ============================ Detail ============================
  if (detail) {
    const rows: { label: string; value: string; mono?: boolean }[] = [
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
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-4 sm:px-6">
            <button
              onClick={() => setDetail(null)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Kembali ke daftar
            </button>
            <button
              onClick={onLogout}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut size={15} />
              Keluar
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1000px] space-y-5 px-4 py-6 sm:px-6">
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
              <Badge className={osTone(detail.osVersion)}>{detail.osVersion}</Badge>
              {detail.specialHardware === "KVM" && (
                <Badge className="bg-violet-50 text-violet-700">KVM</Badge>
              )}
              {detail.mac2 && <Badge className="bg-emerald-50 text-emerald-700">2 Kabel LAN</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Cpu size={19} />
              </span>
              <div>
                <p className="text-xs text-slate-500">Processor / PC</p>
                <p className="text-sm font-semibold text-slate-800">{detail.computer}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
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
                <div key={r.label} className="flex items-start justify-between gap-4 px-5 py-3">
                  <span className="text-[13px] text-slate-500">{r.label}</span>
                  <span
                    className={`text-right text-[13px] font-medium text-slate-800 ${
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
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
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                ← #{detail.no - 1}
              </button>
            ) : <span />}
            {detail.no < computers.length ? (
              <button
                onClick={() => setDetail(computers.find((c) => c.no === detail.no + 1) ?? null)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                #{detail.no + 1} →
              </button>
            ) : <span />}
          </div>
        </main>
      </div>
    );
  }

  // ============================ Daftar ============================
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
              <Monitor size={19} />
            </span>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Inventaris Komputer</h1>
              <p className="text-xs text-slate-500">Plate Mill — HMI PC Specification</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total Komputer" value={s.total} icon={Monitor} tone="bg-blue-50 text-blue-600" />
          <Stat label="2 Kabel LAN" value={s.dualLan} icon={Cpu} tone="bg-violet-50 text-violet-600" hint="Punya MAC #1 & #2" />
          <Stat label="Pakai KVM" value={s.kvm} icon={HardDrive} tone="bg-amber-50 text-amber-600" />
          <Stat label="Software Khusus" value={s.withSpecialSoftware} icon={Shield} tone="bg-emerald-50 text-emerald-600" hint="Ada software tambahan" />
        </div>

        {/* Pencarian */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Cari IP, MAC, model, monitor, OS…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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

          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-[13px] font-medium transition ${
              showFilter || adaFilter
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={16} />
            Filter
          </button>

          <button
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Ekspor CSV
          </button>
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
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <X size={13} />
              Reset filter
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-[13px]">
              <thead>
                <tr>
                  {["No", "IP Address", "MAC Address", "Komputer", "Monitor", "OS", "Disk", "Fitur", ""].map((h, i) => (
                    <th
                      key={h + i}
                      className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
                        i === 8 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasil.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-400">
                      Tidak ada komputer yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
                {hasil.map((c) => (
                  <tr key={c.no} className="transition hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3 tabular-nums text-slate-400">{c.no}</td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <button
                        onClick={() => setDetail(c)}
                        className="font-medium tabular-nums text-blue-600 hover:underline"
                      >
                        {c.ip}
                      </button>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="font-mono text-[12px] tabular-nums text-slate-600">
                        {c.mac1}
                        {c.mac2 && <div className="text-slate-400">{c.mac2}</div>}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">{c.computer}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {c.monitor}
                      <div className="text-[11px] text-slate-400">{c.displayOutput} → {c.monitorInput}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <Badge className={osTone(c.osVersion)}>{c.osVersion}</Badge>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {c.diskType}
                      <div className="text-[11px] text-slate-400">{c.diskCapacity}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <div className="flex gap-1">
                        {c.specialHardware === "KVM" && <Badge className="bg-violet-50 text-violet-700">KVM</Badge>}
                        {c.mac2 && <Badge className="bg-blue-50 text-blue-700">2 LAN</Badge>}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right">
                      <button
                        onClick={() => setDetail(c)}
                        className="text-xs font-medium text-slate-500 hover:text-blue-600"
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

        <p className="pb-4 text-center text-xs text-slate-400">
          Data internal perusahaan — jangan dibagikan ke pihak luar.
        </p>
      </main>
    </div>
  );
}
