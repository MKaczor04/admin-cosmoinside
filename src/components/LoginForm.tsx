'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginForm({ err }: { err: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      // 1) Logowanie
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
        return;
      }

      // 2) Upewnijmy się, że sesja jest aktywna
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        alert('Brak aktywnej sesji po logowaniu. Sprawdź konfigurację supabaseClient.');
        return;
      }

      // 3) Przejście do panelu
      router.replace('/');
      router.refresh();

      // 4) Twardy fallback, gdyby Next pozostał na /login
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          window.location.assign('/');
        }
      }, 60);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-white">
      {/* Logo + tytuł */}
      <div className="mb-8 text-center">
        {/* Umieść plik /public/logo-cosmoinside.png */}
        <img
          src="/logo-cosmoinside.png"
          alt="CosmoInside logo"
          className="mx-auto mb-3 h-80 w-80 object-contain drop-shadow-md"
        />
        <h1 className="text-3xl font-semibold tracking-wide text-slate-100">
          CosmoInside
        </h1>
        <p className="mt-1 text-slate-400">Panel administratora</p>
      </div>

      {/* Karta logowania */}
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur"
      >
        <h2 className="mb-5 text-center text-lg font-semibold text-slate-200">
          Logowanie
        </h2>

        {err === 'forbidden' && (
          <p className="mb-4 rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            Brak uprawnień do panelu.
          </p>
        )}

        <div className="mb-3">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
            placeholder="Adres e-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-5">
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
            placeholder="Hasło"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          disabled={loading || !canSubmit}
          className="w-full rounded-lg bg-slate-800 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Loguję…' : 'Zaloguj się'}
        </button>
      </form>

      {/* Stopka z wersjami */}
      <footer className="mt-10 text-xs text-slate-500">
        Aplikacja CosmoInside: 0.1.0 • Panel administratora: 0.4.1
      </footer>
    </div>
  );
}
