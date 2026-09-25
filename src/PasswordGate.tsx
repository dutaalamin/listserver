"use client";

import { useState } from "react";
import { Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export function PasswordGate({ onUnlock }: { onUnlock: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      await onUnlock(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-[380px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.18)]">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">HMI SERVER</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Masukkan Access Password untuk melanjutkan
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memeriksa…
                </>
              ) : (
                "MASUK"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">
          By Duta Alamin
        </p>
      </div>
    </div>
  );
}
