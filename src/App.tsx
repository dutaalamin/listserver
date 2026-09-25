import { useCallback, useEffect, useState } from "react";
import { Loader2, Server, Monitor } from "lucide-react";
import { fetchPortalData, type ServerItem } from "./api";
import type { Computer } from "./lib";
import { PasswordGate } from "./PasswordGate";
import { ServerList } from "./ServerList";
import { HmiPanel } from "./HmiPanel";

const KEY = "portal_password";

type Tab = "server" | "hmi";

export default function App() {
  const [data, setData] = useState<{ servers: ServerItem[]; hmi: Computer[] } | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("server");

  const unlock = useCallback(async (password: string) => {
    const d = await fetchPortalData(password);
    setData(d);
    setPassword(password);
    try {
      sessionStorage.setItem(KEY, password);
    } catch {
      /* abaikan */
    }
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
        if (!cancelled) {
          setData(d);
          setPassword(saved);
        }
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
      {/* Tab menu */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
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
        </div>
      </header>

      {/* Isi */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {tab === "server" ? (
          <ServerList
            servers={data.servers}
            password={password}
            onChanged={(list) =>
              setData((prev) => (prev ? { ...prev, servers: list } : prev))
            }
          />
        ) : (
          <HmiPanel
            computers={data.hmi}
            password={password}
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
          />
        )}
      </main>
    </div>
  );
}
