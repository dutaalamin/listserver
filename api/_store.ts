import { get, put } from "@vercel/blob";

/** Lokasi file data di Blob store (private). */
const PATHNAME = "portal/data.json";

export interface PortalData {
  servers: unknown[];
  hmi: Record<string, unknown>[];
}

/**
 * Baca data dari Blob. Kalau belum ada, tanam (seed) dari env PORTAL_DATA.
 * Blob bersifat "private" — hanya bisa dibaca dengan token server.
 */
export async function readData(): Promise<PortalData> {
  try {
    const res = await get(PATHNAME, { access: "private", useCache: false });
    if (res?.statusCode === 200 && res.stream) {
      const text = await new Response(res.stream).text();
      return JSON.parse(text) as PortalData;
    }
  } catch {
    /* belum ada di Blob -> lanjut seed */
  }

  const raw = process.env.PORTAL_DATA;
  if (!raw) throw new Error("PORTAL_DATA belum di-set");

  const seeded = JSON.parse(raw) as PortalData;
  await writeData(seeded);
  return seeded;
}

export async function writeData(data: PortalData): Promise<void> {
  await put(PATHNAME, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Field HMI yang boleh diubah dari UI (whitelist). */
export const EDITABLE_FIELDS = [
  "hostname",
  "username",
  "password",
  "ip",
  "mac1",
  "mac2",
  "location",
  "room",
  "computer",
  "monitor",
  "displayOutput",
  "monitorInput",
  "osVersion",
  "framework",
  "antivirus",
  "osBlock",
  "diskType",
  "diskCapacity",
  "diskQty",
  "usbQty",
  "usbUsage",
  "specialSoftware",
  "specialHardware",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Ambil hanya field yang diizinkan dari objek patch. */
export function pickEditable(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in patch) out[key] = patch[key];
  }
  return out;
}
