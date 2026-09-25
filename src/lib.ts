export interface Server {
  id: number;
  name: string;
  ipAddress: string;
  location: string;
  category: string;
}

export interface Computer {
  no: number;
  password: string;
  ip: string;
  mac1: string;
  mac2: string | null;
  computer: string;
  /** Lokasi utama (dari Excel). */
  location?: string;
  /** Ruangan / area (dari Excel). */
  room?: string;
  /** Hostname komputer (dari Excel). */
  hostname?: string;
  /** Username login Windows (dari Excel). */
  username?: string;
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

export interface PortalData {
  servers: Server[];
  hmi: Computer[];
}

/** Urutan kategori sesuai tampilan list server. */
export const CATEGORY_ORDER = [
  "SHEARING",
  "COMPUTER ROOM",
  "FURNACE",
  "FM",
  "ACC",
  "TECH AND PLANT",
  "DATA CENTER (PL1)",
  "OTHER",
];

// ============================ HMI: filter ============================

export interface HmiFilters {
  q: string;
  osVersion: string;
  computer: string;
  diskType: string;
  feature: string;
}

export const EMPTY_HMI_FILTERS: HmiFilters = {
  q: "",
  osVersion: "",
  computer: "",
  diskType: "",
  feature: "",
};

function hmiHaystack(c: Computer): string {
  return [
    c.ip, c.mac1, c.mac2 ?? "", c.computer, c.monitor, c.osVersion,
    c.antivirus, c.diskType, c.diskCapacity, c.displayOutput, c.monitorInput,
    c.specialSoftware ?? "", c.specialHardware ?? "",
    c.location ?? "", c.room ?? "", c.hostname ?? "", c.username ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterComputers(items: Computer[], f: HmiFilters): Computer[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((c) => {
    if (q && !hmiHaystack(c).includes(q)) return false;
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

// ============================ List Server: filter ============================

export function filterServers(items: Server[], q: string): Server[] {
  const s = q.trim().toLowerCase();
  if (!s) return items;
  return items.filter(
    (x) =>
      x.name.toLowerCase().includes(s) ||
      x.ipAddress.toLowerCase().includes(s) ||
      x.location.toLowerCase().includes(s) ||
      x.category.toLowerCase().includes(s),
  );
}
