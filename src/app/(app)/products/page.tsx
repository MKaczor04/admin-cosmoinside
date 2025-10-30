'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  id: number;
  name: string;
  thumb_url: string | null;
  brands: { name: string }[]; // przez relację aliasowaną
};

export default function ProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id,name,thumb_url,brands(name)')
        .order('id', { ascending: true })
        .limit(50);

      if (error) {
        alert('Błąd pobrania produktów: ' + error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as any);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Produkty</h1>
      {loading ? (
        <p>Wczytuję…</p>
      ) : rows.length === 0 ? (
        <p>Brak produktów.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((p) => (
            <li key={p.id} className="py-2 flex items-center gap-3">
              {p.thumb_url ? (
                <img src={p.thumb_url} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-gray-200" />
              )}
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-500">{p.brands?.[0]?.name ?? '—'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
