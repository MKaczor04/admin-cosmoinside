'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Bug = {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'closed' | string;
  created_at: string;
  user_id: string | null;
};

export default function BugDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bug_reports')
        .select('id, title, description, status, created_at, user_id')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        alert('Błąd pobierania zgłoszenia: ' + error.message);
        router.replace('/');
        return;
      }
      if (!data) {
        alert('Nie znaleziono zgłoszenia.');
        router.replace('/');
        return;
      }
      setBug(data as Bug);
      setLoading(false);
    })();
  }, [id, router]);

  const toggleStatus = async () => {
    if (!bug) return;
    const next = bug.status === 'open' ? 'closed' : 'open';
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status: next })
        .eq('id', bug.id);
      if (error) throw error;
      setBug({ ...bug, status: next });
      // jeśli zamykamy, wróć na dashboard (żeby „zniknęło” z listy)
      if (next === 'closed') router.replace('/');
    } catch (e: any) {
      alert('Nie udało się zaktualizować statusu: ' + (e?.message ?? e));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 text-slate-200 shadow-lg">
          Wczytuję…
        </div>
      </div>
    );
  }

  if (!bug) return null;

  const isOpen = bug.status === 'open';

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="truncate text-2xl font-bold text-slate-100">{bug.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleStatus}
            disabled={updating}
            className={`rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              isOpen ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={isOpen ? 'Oznacz jako naprawione' : 'Otwórz ponownie'}
          >
            {updating ? 'Aktualizuję…' : isOpen ? 'Oznacz jako naprawione' : 'Otwórz ponownie'}
          </button>

          <Link
            href="/"
            className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
          >
            Wróć
          </Link>
        </div>
      </div>

      {/* Karta */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">ID</div>
            <div className="text-slate-100">{bug.id}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
            <div className={`inline-flex items-center gap-2 rounded px-2 py-0.5 text-slate-100 ${isOpen ? 'bg-amber-600/30' : 'bg-emerald-700/30'}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {bug.status}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Zgłaszający (user_id)</div>
            <div className="font-mono text-slate-300">{bug.user_id ?? '—'}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Data</div>
            <div className="text-slate-100">{new Date(bug.created_at).toLocaleString()}</div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Opis</div>
            <div className="mt-1 whitespace-pre-wrap text-slate-100">{bug.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
