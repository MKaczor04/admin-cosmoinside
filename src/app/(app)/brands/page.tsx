'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Brand = { id: number; name: string };

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('brands').select('id,name').order('name');
    if (error) {
      alert('Błąd pobierania marek: ' + error.message);
      setBrands([]);
    } else {
      setBrands(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBrand = async () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const { error } = await supabase.from('brands').insert({ name: n });
    setSaving(false);
    if (error) {
      alert('Błąd dodawania: ' + error.message);
      return;
    }
    setName('');
    await load();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Marki</h1>

      <div className="mb-6 flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          placeholder="Nazwa marki…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          onClick={addBrand}
          disabled={saving || name.trim().length === 0}
        >
          {saving ? 'Zapisuję…' : 'Dodaj'}
        </button>
      </div>

      {loading ? (
        <p>Wczytuję…</p>
      ) : brands.length === 0 ? (
        <p>Brak marek.</p>
      ) : (
        <ul className="divide-y">
          {brands.map((b) => (
            <li key={b.id} className="py-2 flex items-center justify-between">
              <span>{b.name}</span>
              {/* na później: edycja/usuń */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
