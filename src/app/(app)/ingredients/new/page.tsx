'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewIngredientPage() {
  const router = useRouter();
  const [inci, setInci] = useState('');
  const [functionsCsv, setFunctionsCsv] = useState('');
  const [safety, setSafety] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const toArray = (csv: string) => {
    const arr = csv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : null;
  };

  const save = async () => {
    const inci_name = inci.trim();
    if (!inci_name) {
      alert('Podaj nazwę INCI.');
      return;
    }
    setSaving(true);

    const { error } = await supabase.from('ingredients').insert({
      inci_name,
      functions: toArray(functionsCsv),
      safety_level: safety === '' ? null : Math.max(0, Math.min(5, Number(safety))),
      is_new: true,
    });

    setSaving(false);
    if (error) return alert(error.message);
    router.replace('/ingredients');
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* Nagłówek strony */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Nowy składnik</h1>
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

        {/* Funkcje (CSV) */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Funkcje (CSV)</label>
          <input
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            value={functionsCsv}
            onChange={(e) => setFunctionsCsv(e.target.value)}
            placeholder="np. humectant, solvent"
          />
          <p className="mt-1 text-xs text-slate-400">
            Wpisz po przecinku, np.: <span className="font-mono">humectant, solvent</span>
          </p>
        </div>

        {/* Safety level */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-300">Poziom bezpieczeństwa</label>
          <select
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            value={safety}
            onChange={(e) => setSafety(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">— brak —</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Akcje */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
          >
            {saving ? 'Zapisuję…' : 'Zapisz'}
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
