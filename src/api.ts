import type { Computer } from "./lib";

export interface ServerItem {
  id: number;
  name: string;
  ipAddress: string;
  location: string;
  category: string;
}

/**
 * Ambil data portal. Bisa dipanggil TANPA password (halaman publik) atau
 * DENGAN password (sekaligus memverifikasi untuk membuka kunci edit).
 */
export async function fetchPortalData(
  password = "",
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

/**
 * Verifikasi password untuk membuka kunci edit. Mengembalikan data terbaru
 * sekaligus, supaya setelah unlock daftar langsung segar.
 */
export async function verifyPassword(
  password: string,
): Promise<{ servers: ServerItem[]; hmi: Computer[] }> {
  return fetchPortalData(password);
}

/** Simpan (tambah/ubah) atau hapus server. Mengembalikan daftar terbaru. */
export async function saveServer(
  password: string,
  server: Partial<ServerItem> & { id?: number },
): Promise<ServerItem[]> {
  const res = await fetch("/api/server", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "save", server }),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; servers?: ServerItem[] };
  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan.");
  return j.servers ?? [];
}

export async function deleteServer(password: string, id: number): Promise<ServerItem[]> {
  const res = await fetch("/api/server", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "delete", id }),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; servers?: ServerItem[] };
  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal menghapus.");
  return j.servers ?? [];
}

/** Tambah komputer HMI baru. Mengembalikan seluruh daftar HMI terbaru. */
export async function addComputer(
  password: string,
  computer: Partial<Computer>,
): Promise<Computer[]> {
  const res = await fetch("/api/hmi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "add", computer }),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; hmi?: Computer[] };
  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal menambah.");
  return j.hmi ?? [];
}

/** Hapus komputer HMI. Mengembalikan seluruh daftar HMI terbaru. */
export async function deleteComputer(password: string, no: number): Promise<Computer[]> {
  const res = await fetch("/api/hmi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, action: "delete", no }),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; hmi?: Computer[] };
  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal menghapus.");
  return j.hmi ?? [];
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

// ============================ Foto Spek PC ============================

export interface SpekFotoItem {
  id: string;
  nama: string;
  url: string;
  hostname: string;
  ip: string;
  model: string;
  waktu: number;
}

async function kirimFoto(
  body: Record<string, unknown>,
): Promise<SpekFotoItem[]> {
  const res = await fetch("/api/foto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    foto?: SpekFotoItem[];
  };
  if (res.status === 401) throw new Error("Password salah — sesi mungkin habis.");
  if (res.status === 413) throw new Error(j.error ?? "Gambar terlalu besar.");
  if (res.status === 429) throw new Error(j.error ?? "Terlalu banyak percobaan.");
  if (!res.ok) throw new Error(j.error ?? "Gagal memproses foto.");
  return j.foto ?? [];
}

/** Ambil semua foto spek PC. */
export function listFoto(password: string): Promise<SpekFotoItem[]> {
  return kirimFoto({ password, action: "list" });
}

/** Unggah foto baru (base64 tanpa prefix data URL). */
export function addFoto(
  password: string,
  foto: {
    hostname: string;
    ip: string;
    model: string;
    gambarBase64: string;
    mime: string;
  },
): Promise<SpekFotoItem[]> {
  return kirimFoto({ password, action: "add", foto });
}

/** Ubah metadata foto. */
export function updateFoto(
  password: string,
  id: string,
  patch: { hostname?: string; ip?: string; model?: string },
): Promise<SpekFotoItem[]> {
  return kirimFoto({ password, action: "update", id, patch });
}

/** Hapus foto (termasuk file di blob). */
export function deleteFoto(password: string, id: string): Promise<SpekFotoItem[]> {
  return kirimFoto({ password, action: "delete", id });
}
