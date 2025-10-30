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
      console.log('Zalogowano:', data, 'error:', error);

      if (error) {
        alert(error.message);
        return;
      }

      // 2) Upewnij się, że sesja jest aktywna po stronie klienta
      const { data: sess } = await supabase.auth.getSession();
      console.log('getSession() po logowaniu:', sess);

      if (!sess.session) {
        alert('Brak aktywnej sesji po logowaniu. Sprawdź konfigurację supabaseClient.');
        return;
      }

      // 3) Miękkie przejście + odświeżenie
      router.replace('/');
      router.refresh();

      // 4) Twardy fallback (czasem Next zostaje na /login)
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          window.location.assign('/');
        }
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Logowanie</h1>

        {err === 'forbidden' && (
          <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">
            Brak uprawnień do panelu.
          </p>
        )}

        <input
          className="mb-3 w-full rounded border p-2"
          placeholder="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded border p-2"
          placeholder="Hasło"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading || !canSubmit}
          className="w-full rounded bg-slate-900 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'Loguję…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
