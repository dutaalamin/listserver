export interface Computer {
  no: number;
  password: string;
  ip: string;
  mac1: string;
  mac2: string | null;
  computer: string;
  displayOutput: string;
  monitor: string;
  monitorInput: string;
  usbQty: number;
  usbUsage: number;
  osBlock: number;
  antivirus: string;
  osVersion: string;
  framework: string;
  diskQty: number;
  diskType: string;
  diskCapacity: string;
  specialSoftware: string | null;
  specialHardware: string | null;
}

export interface Filters {
  q: string;
  osVersion: string;
  computer: string;
  diskType: string;
  feature: string;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  osVersion: "",
  computer: "",
  diskType: "",
  feature: "",
};

/** Kumpulkan teks yang bisa dicari dari satu komputer. */
function haystack(c: Computer): string {
  return [
    c.ip, c.mac1, c.mac2 ?? "", c.computer, c.monitor, c.osVersion,
    c.antivirus, c.diskType, c.diskCapacity, c.displayOutput, c.monitorInput,
    c.specialSoftware ?? "", c.specialHardware ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterComputers(items: Computer[], f: Filters): Computer[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((c) => {
    if (q && !haystack(c).includes(q)) return false;
    if (f.osVersion && c.osVersion !== f.osVersion) return false;
    if (f.computer && c.computer !== f.computer) return false;
    if (f.diskType && c.diskType !== f.diskType) return false;
    if (f.feature === "kvm" && c.specialHardware !== "KVM") return false;
    if (f.feature === "dual-lan" && !c.mac2) return false;
    return true;
  });
}

export function uniqueValues(items: Computer[], pick: (c: Computer) => string): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const v = pick(it);
    if (v && String(v).trim()) set.add(String(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

export interface Summary {
  total: number;
  byOs: { label: string; count: number }[];
  byComputer: { label: string; count: number }[];
  dualLan: number;
  kvm: number;
  withSpecialSoftware: number;
}

function countBy(items: Computer[], pick: (c: Computer) => string) {
  const m = new Map<string, number>();
  for (const c of items) {
    const k = pick(c);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "id"));
}

export function summarize(items: Computer[]): Summary {
  return {
    total: items.length,
    byOs: countBy(items, (c) => c.osVersion),
    byComputer: countBy(items, (c) => c.computer),
    dualLan: items.filter((c) => c.mac2).length,
    kvm: items.filter((c) => c.specialHardware === "KVM").length,
    withSpecialSoftware: items.filter((c) => c.specialSoftware).length,
  };
}
