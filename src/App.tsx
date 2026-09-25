import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchComputers } from "./api";
import type { Computer } from "./lib";
import { PasswordGate } from "./PasswordGate";
import { Inventory } from "./Inventory";

const KEY = "inv_password";

export default function App() {
  const [computers, setComputers] = useState<Computer[] | null>(null);
  const [loading, setLoading] = useState(true);

  /** Buka dengan password: ambil data dari server. */
  const unlock = useCallback(async (password: string) => {
    const data = await fetchComputers(password);
    setComputers(data);
    // Simpan agar tidak diminta password terus saat refresh.
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
    setComputers(null);
  }, []);

  // Saat pertama buka: kalau sudah pernah masuk di tab ini, langsung muat.
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

    fetchComputers(saved)
      .then((data) => {
        if (!cancelled) setComputers(data);
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

  if (!computers) return <PasswordGate onUnlock={unlock} />;
  return <Inventory computers={computers} onLogout={logout} />;
}
