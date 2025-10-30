'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginForm({ err }: { err: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) alert(error.message);
    else router.replace('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold">Logowanie</h1>
        {err === 'forbidden' && <p className="mb-2 text-sm text-red-600">Brak uprawnień.</p>}
        <input className="mb-3 w-full rounded border p-2" placeholder="Email"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="mb-4 w-full rounded border p-2" placeholder="Hasło" type="password"
               value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full rounded bg-slate-900 p-2 font-semibold text-white">
          {loading ? 'Loguję…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
