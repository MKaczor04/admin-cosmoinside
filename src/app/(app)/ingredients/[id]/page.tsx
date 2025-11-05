'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Ingredient = {
  id: number;
  inci_name: string;
  functions: string[] | string | null;
  level_of_recommendation: string | null;
};

const normalizeFunctions = (v: string[] | string | null | undefined): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      const t = v.trim();
      if (!t) return [];
      return t.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export default function IngredientDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [row, setRow] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, inci_name, functions, level_of_recommendation')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        alert(error.message);
        router.replace('/ingredients');
        return;
      }
      if (!data) {
        alert('Nie znaleziono składnika.');
        router.replace('/ingredients');
        return;
      }
      setRow(data as Ingredient);
      setLoading(false);
    })();
  }, [id, router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 text-slate-200 shadow-lg">
          Wczytuję…
        </div>
      </div>
    );
  }

  if (!row) return null;

  const fn = normalizeFunctions(row.functions);
  const level = row.level_of_recommendation ?? '—';

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="truncate text-2xl font-bold text-slate-100">{row.inci_name}</h1>
        <div className="flex gap-2">
          <Link
            href={`/ingredients/${row.id}/edit`}
            className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
          >
            Edytuj
          </Link>
          <button
            onClick={() => router.back()}
            className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            Wróć
          </button>
        </div>
      </div>

      {/* Karta danych */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">ID</div>
            <div className="text-slate-100">{row.id}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Poziom rekomendacji</div>
            <div className="text-slate-100">{level}</div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-xs uppercase tracking-wide text-slate-400">Funkcje</div>
            {fn.length ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {fn.map((f, idx) => (
                  <span
                    key={`${f}-${idx}`}
                    className="rounded bg-slate-700/60 px-2 py-0.5 text-sm text-slate-200"
                  >
                    {f}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-300">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
