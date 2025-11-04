'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type BrandObj = { id: number; name: string };
type ProductRow = {
  id: number;
  name: string;
  thumb_url: string | null;
  // alias z relacji po FK (może wrócić obiekt lub tablica obiektów – obsługujemy oba)
  brand?: BrandObj | BrandObj[] | null;
};

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);

  const getBrandName = (b: ProductRow['brand']): string | null => {
    if (!b) return null;
    return Array.isArray(b) ? (b[0]?.name ?? null) : (b.name ?? null);
  };

  const fetchProducts = async (query: string) => {
    setLoading(true);
    const s = query.trim();

    let rq = supabase
      .from('products')
      .select(
        `
        id,
        name,
        thumb_url,
        brand:brands!products_brand_id_fkey ( id, name )
      `
      )
      .order('id', { ascending: true })
      .limit(200);

    if (s.length > 0) {
      rq = rq.ilike('name', `%${s}%`);
    }

    const { data, error } = await rq;

    if (error) {
      alert('Błąd pobierania produktów: ' + error.message);
      setRows([]);
    } else {
      setRows((data as ProductRow[]) ?? []);
    }
    setLoading(false);
  };

  // startowe pobranie
  useEffect(() => {
    fetchProducts('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce wyszukiwarki
  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => {
      fetchProducts(q);
      setTyping(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const removeProduct = async (id: number, name: string) => {
    if (!confirm(`Usunąć produkt „${name}”?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Błąd usuwania: ' + error.message);
    else setRows((r) => r.filter((x) => x.id !== id));
  };

  // „ładniejszy” placeholder, gdy nie ma miniatury
  const Thumb = ({ url }: { url: string | null }) =>
    url ? (
      <img
        src={url}
        alt=""
        className="h-12 w-12 rounded-lg border object-cover shadow-sm"
      />
    ) : (
      <div className="h-12 w-12 rounded-lg border bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
    );

  const headerRight = useMemo(
    () => (
      <Link
        href="/products/new"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        + Dodaj produkt
      </Link>
    ),
    []
  );

  return (
    <div className="w-full">
      {/* Pasek tytułu strony */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-6">
          <h1 className="text-2xl font-bold">Produkty</h1>
          {headerRight}
        </div>
      </div>

      {/* Karta z treścią wycentrowaną */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border bg-gray p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Wyszukiwarka */}
          <div className="mb-4 flex items-center gap-3">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition
                         focus:border-slate-400 focus:ring-2 focus:ring-slate-300
                         dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Szukaj po nazwie…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {typing && (
              <span className="text-xs text-slate-500">Filtruję…</span>
            )}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="py-10 text-center text-slate-500">Wczytuję…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="text-slate-500">Brak produktów.</div>
              <Link
                href="/products/new"
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Dodaj pierwszy produkt
              </Link>
            </div>
          ) : (
            <ul className="divide-y dark:divide-slate-800">
              {rows.map((p) => {
                const brandName = getBrandName(p.brand);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-4 py-3 sm:py-4"
                  >
                    <Thumb url={p.thumb_url} />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold sm:text-base">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {brandName ?? '—'}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Link
                        href={`/products/${p.id}/edit`}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Edytuj
                      </Link>
                      <button
                        onClick={() => removeProduct(p.id, p.name)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Usuń
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
