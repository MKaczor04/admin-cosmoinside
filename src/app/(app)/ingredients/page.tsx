'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Ingredient = {
  id: number;
  inci_name: string;
  functions: string[] | string | null; // ⬅️ dodany string
  safety_level: number | null;
  is_new: boolean | null;
};

export default function IngredientsPage() {
  const [rows, setRows] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ingredients')
      .select('id, inci_name, functions, safety_level, is_new')
      .order('inci_name', { ascending: true });

    if (error) {
      alert('Błąd pobierania składników: ' + error.message);
      setRows([]);
    } else {
      setRows((data as Ingredient[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((i) => {
      const fnTxt = Array.isArray(i.functions)
        ? i.functions.join(', ').toLowerCase()
        : typeof i.functions === 'string'
        ? i.functions.toLowerCase()
        : '';

      return (
        (i.inci_name ?? '').toLowerCase().includes(s) ||
        fnTxt.includes(s) ||
        (i.safety_level !== null && String(i.safety_level).includes(s))
      );
    });
  }, [q, rows]);

  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 200);
    return () => clearTimeout(t);
  }, [q]);

  const remove = async (id: number, name: string) => {
    if (!confirm(`Usunąć składnik „${name}”?`)) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', id);
    if (error) return alert(error.message);
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  const markReviewed = async (id: number) => {
    const { error } = await supabase.from('ingredients').update({ is_new: false }).eq('id', id);
    if (error) return alert(error.message);
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, is_new: false } : x)));
  };

  const empty = !loading && filtered.length === 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Składniki (INCI)</h1>
        <Link
          href="/ingredients/new"
          className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          + Dodaj składnik
        </Link>
      </div>

      {/* Karta z listą */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4 shadow-lg backdrop-blur">
        {/* Wyszukiwarka */}
        <input
          className="mb-3 w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
          placeholder="Szukaj po INCI / funkcji / poziomie bezpieczeństwa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {typing && <p className="mb-3 text-xs text-slate-400">Filtruję…</p>}

        {/* Lista */}
        {loading ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-3">
                <div>
                  <div className="h-4 w-48 animate-pulse rounded bg-slate-700" />
                  <div className="mt-2 h-3 w-20 animate-pulse rounded bg-slate-700" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded bg-slate-700" />
                  <div className="h-8 w-14 animate-pulse rounded bg-slate-700" />
                </div>
              </li>
            ))}
          </ul>
        ) : empty ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 text-center text-slate-300">
            Brak wyników.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((i) => (
              <li
                key={i.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Lewa część: nazwa + badge NOWY */}
                <div className="min-w-0 leading-tight">
                  <div className="truncate font-semibold text-slate-100">{i.inci_name}</div>
                  {i.is_new ? (
                    <span className="mt-1 inline-flex rounded bg-amber-600/30 px-2 py-0.5 text-xs text-amber-300">
                      NOWY
                    </span>
                  ) : null}
                </div>

                {/* Prawa część: akcje */}
                <div className="flex flex-wrap items-center gap-2">
                  {i.is_new && (
                    <button
                      onClick={() => markReviewed(i.id)}
                      className="rounded-md border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
                    >
                      Oznacz jako uzupełnione
                    </button>
                  )}
                  <Link
                    href={`/ingredients/${i.id}/edit`}
                    className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
                  >
                    Edytuj
                  </Link>
                  <button
                    onClick={() => remove(i.id, i.inci_name)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
