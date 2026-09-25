import type { Computer } from "./lib";

/**
 * Ambil data dari server setelah password benar.
 * Data TIDAK ada di bundle browser — hanya diterima setelah lolos cek server.
 */
export async function fetchComputers(password: string): Promise<Computer[]> {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (res.status === 401) {
    throw new Error("Password salah.");
  }
  if (res.status === 429) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Terlalu banyak percobaan. Coba lagi nanti.");
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Gagal memuat data.");
  }

  const json = (await res.json()) as { computers: Computer[] };
  return json.computers;
}
