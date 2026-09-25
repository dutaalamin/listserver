import { useCallback, useEffect, useState } from "react";
import { Loader2, Server, Monitor, LogOut } from "lucide-react";
import { fetchPortalData, type ServerItem } from "./api";
import type { Computer } from "./lib";
import { PasswordGate } from "./PasswordGate";
import { ServerList } from "./ServerList";
import { HmiPanel } from "./HmiPanel";

const KEY = "portal_password";

type Tab = "server" | "hmi";

export default function App() {
  const [data, setData] = useState<{ servers: ServerItem[]; hmi: Computer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("server");

  const unlock = useCallback(async (password: string) => {
    const d = await fetchPortalData(password);
    setData(d);
    try {
      sessionStorage.setItem(KEY, password);
    } catch {
      /* abaikan */
    }
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* abaikan */
    }
    setData(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const saved = (() => {
      try {
        return sessionStorage.getItem(KEY);
      } catch {
        return null;
      }
    })();

    if (!saved) {
      setLoading(false);
      return;
    }

    fetchPortalData(saved)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          /* abaikan */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return <PasswordGate onUnlock={unlock} />;

  const TABS: { id: Tab; label: string; icon: typeof Server; count: number }[] = [
    { id: "server", label: "List Server", icon: Server, count: data.servers.length },
    { id: "hmi", label: "HMI Plate Mill", icon: Monitor, count: data.hmi.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header + tab menu */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
                <Server size={19} />
              </span>
              <div>
                <h1 className="text-base font-semibold text-slate-900">POSCO IT Portal</h1>
                <p className="text-xs text-slate-500">Shearing Line — Server & HMI</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut size={15} />
              Keluar
            </button>
          </div>

          {/* Tab */}
          <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const aktif = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                    aktif
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      aktif ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Isi */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {tab === "server" ? (
          <ServerList servers={data.servers} />
        ) : (
          <HmiPanel computers={data.hmi} />
        )}

        <p className="mt-8 pb-4 text-center text-xs text-slate-400">
          Data internal perusahaan — jangan dibagikan ke pihak luar.
        </p>
      </main>
    </div>
  );
}
