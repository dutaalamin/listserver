import { useCallback, useEffect, useState } from "react";
import { Loader2, Server, Monitor, Camera, Lock, Unlock } from "lucide-react";
import { fetchPortalData, verifyPassword, type ServerItem } from "./api";
import type { Computer } from "./lib";
import { PasswordGate } from "./PasswordGate";
import { ServerList } from "./ServerList";
import { HmiPanel } from "./HmiPanel";
import { SpekFotoGaleri } from "./SpekFoto";

const KEY = "portal_password";

type Tab = "server" | "hmi" | "foto";

export default function App() {
  const [data, setData] = useState<{ servers: ServerItem[]; hmi: Computer[] } | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("server");
  // true saat user menekan "Buka Edit" -> tampilkan modal password
  const [askUnlock, setAskUnlock] = useState(false);

  // Data selalu dimuat tanpa password (halaman publik).
  useEffect(() => {
    let cancelled = false;
    const saved = (() => {
      try {
        return sessionStorage.getItem(KEY) ?? "";
      } catch {
        return "";
      }
    })();

    fetchPortalData(saved)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Kalau password tersimpan ternyata masih valid, buka kunci otomatis.
        if (saved) setPassword(saved);
      })
      .catch(() => {
        if (!cancelled) setData({ servers: [], hmi: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Dipanggil dari modal: verifikasi password untuk membuka kunci edit.
  const unlock = useCallback(async (pw: string) => {
    const d = await verifyPassword(pw);
    setData(d);
    setPassword(pw);
    setAskUnlock(false);
    try {
      sessionStorage.setItem(KEY, pw);
    } catch {
      /* abaikan */
    }
  }, []);

  const lock = useCallback(() => {
    setPassword("");
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* abaikan */
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const locked = !password;

  const TABS: { id: Tab; label: string; icon: typeof Server; count: number }[] = [
    { id: "server", label: "List Server", icon: Server, count: data?.servers.length ?? 0 },
    { id: "hmi", label: "HMI Plate Mill", icon: Monitor, count: data?.hmi.length ?? 0 },
    { id: "foto", label: "Foto Spek PC", icon: Camera, count: 5 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Tab menu */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <nav className="-mb-px flex flex-1 gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const aktif = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] font-medium transition sm:px-4 sm:text-sm ${
                    aktif
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      aktif ? "bg-slate-200 text-slate-800" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Kunci edit */}
          {locked ? (
            <button
              onClick={() => setAskUnlock(true)}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-[13px] font-medium text-white transition hover:bg-slate-800"
            >
              <Lock size={15} />
              <span className="hidden sm:inline">Buka Edit</span>
            </button>
          ) : (
            <button
              onClick={lock}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Unlock size={15} />
              <span className="hidden sm:inline">Mode Edit</span>
            </button>
          )}
        </div>
      </header>

      {/* Isi */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {tab === "server" ? (
          <ServerList
            servers={data?.servers ?? []}
            password={password}
            canEdit={!locked}
            onRequestUnlock={() => setAskUnlock(true)}
            onChanged={(list) =>
              setData((prev) => (prev ? { ...prev, servers: list } : prev))
            }
          />
        ) : tab === "hmi" ? (
          <HmiPanel
            computers={data?.hmi ?? []}
            password={password}
            canEdit={!locked}
            onRequestUnlock={() => setAskUnlock(true)}
            onSaved={(updated) =>
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      hmi: prev.hmi.map((c) => (c.no === updated.no ? updated : c)),
                    }
                  : prev,
              )
            }
            onChanged={(list) =>
              setData((prev) => (prev ? { ...prev, hmi: list } : prev))
            }
          />
        ) : (
          <SpekFotoGaleri
            password={password}
            canEdit={!locked}
            onRequestUnlock={() => setAskUnlock(true)}
          />
        )}
      </main>

      {/* Modal buka kunci edit */}
      {askUnlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[380px]">
            <PasswordGate onUnlock={unlock} onCancel={() => setAskUnlock(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
