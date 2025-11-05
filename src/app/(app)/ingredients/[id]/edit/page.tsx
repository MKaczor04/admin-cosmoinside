'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Ingredient = {
  id: number;
  inci_name: string;
  functions: string[] | string | null; // ⬅️ dodany string
  safety_level: number | null;
  is_new: boolean | null;
};

export default function EditIngredientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [ing, setIng] = useState<Ingredient | null>(null);
  const [inci, setInci] = useState('');
  const [functionsCsv, setFunctionsCsv] = useState('');
  const [safety, setSafety] = useState<number | ''>('');
  const [isNew, setIsNew] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const normalizeFunctions = (v: string[] | string | null | undefined): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') {
    try {
      // Jeśli to JSON, np. ["humectant","solvent"]
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // Jeśli zwykły tekst, np. "emollient, humectant"
      const t = v.trim();
      if (!t) return [];
      return t.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};


  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('ingredients')
          .select('id, inci_name, functions, safety_level, is_new')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          alert('Nie znaleziono składnika.');
          router.replace('/ingredients');
          return;
        }

        setIng(data as Ingredient);
        setInci(data.inci_name ?? '');
        setFunctionsCsv(normalizeFunctions(data.functions).join(', '));
        setSafety(typeof data.safety_level === 'number' ? data.safety_level : '');
        setIsNew(Boolean(data.is_new));
      } catch (e: any) {
        alert(e?.message ?? 'Błąd pobierania składnika');
        router.replace('/ingredients');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const toArray = (csv: string) => {
    const t = (csv ?? '').trim();
    if (!t) return null;
    const arr = t.split(',').map(s => s.trim()).filter(Boolean);
    return arr.length ? arr : null;
  };

  const save = async () => {
    if (!ing) return;
    const inci_name = inci.trim();
    if (!inci_name) {
      alert('Podaj nazwę INCI.');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from('ingredients')
        .update({
          inci_name,
          functions: toArray(functionsCsv), // zapis jako text[] / null
          safety_level: safety === '' ? null : Math.max(0, Math.min(5, Number(safety))),
          is_new: isNew,
        })
        .eq('id', ing.id);

      if (error) throw error;
      router.replace('/ingredients');
    } catch (e: any) {
      alert(e?.message ?? 'Błąd zapisu składnika');
    } finally {
      setSaving(false);
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Edycja składnika</h1>
      </div>

      {/* Karta formularza */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
        {/* INCI */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa INCI</label>
          <input
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            value={inci}
            onChange={(e) => setInci(e.target.value)}
            placeholder="np. AQUA"
          />
        </div>

        {/* Funkcje */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Funkcje (CSV)</label>
          <input
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            value={functionsCsv}
            onChange={(e) => setFunctionsCsv(e.target.value)}
            placeholder="np. emollient, conditioning"
          />
          <p className="mt-1 text-xs text-slate-400">
            Wpisz po przecinku, np.: <span className="font-mono">emollient, conditioning</span>
          </p>
        </div>

        {/* Safety */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-300">Poziom bezpieczeństwa</label>
          <select
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            value={safety}
            onChange={(e) => setSafety(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">— brak —</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Nowy? */}
        <div className="mb-6 flex items-center gap-2">
          <input
            id="is_new"
            type="checkbox"
            checked={isNew}
            onChange={(e) => setIsNew(e.target.checked)}
            className="h-4 w-4 accent-slate-500"
          />
          <label htmlFor="is_new" className="text-sm text-slate-300">
            Oznacz jako NOWY
          </label>
        </div>

        {/* Akcje */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
          >
            {saving ? 'Zapisuję…' : 'Zapisz zmiany'}
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
}
