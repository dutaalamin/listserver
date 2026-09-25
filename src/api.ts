import type { Computer } from "./lib";

export interface ServerItem {
  id: number;
  name: string;
  ipAddress: string;
  location: string;
  category: string;
}

/**
 * Ambil data dari server setelah password benar.
 * Data TIDAK ada di bundle browser — hanya diterima setelah lolos cek server.
 */
export async function fetchPortalData(
  password: string,
): Promise<{ servers: ServerItem[]; hmi: Computer[] }> {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (res.status === 401) throw new Error("Password salah.");
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Terlalu banyak percobaan. Coba lagi nanti.");
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Gagal memuat data.");
  }

  const json = (await res.json()) as { servers: ServerItem[]; hmi: Computer[] };
  return { servers: json.servers, hmi: json.hmi };
}

/** Simpan perubahan satu komputer HMI. Mengembalikan data terbaru dari server. */
export async function saveComputer(
  password: string,
  no: number,
  patch: Partial<Computer>,
): Promise<Computer> {
  const res = await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, no, patch }),
  });

  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    computer?: Computer;
  };

  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan.");
  if (!j.computer) throw new Error("Server tidak mengembalikan data.");

  return j.computer;
}
