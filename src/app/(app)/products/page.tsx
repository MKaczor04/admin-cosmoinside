'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type BrandObj = { id: number; name: string };

type ProductRow = {
  id: number;
  name: string;
  thumb_url: string | null;
  // może nie istnieć, dlatego opcjonalne:
  is_new?: boolean | null;
  // alias relacji po FK; bywa obiekt lub tablica obiektów (zależnie od konfiguracji)
  brand?: BrandObj | BrandObj[] | null;
};

export default function ProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [q, setQ] = useState('');
  const [hasIsNew, setHasIsNew] = useState(false);

  // ————————————————— helpers —————————————————
  const getBrandName = (b: ProductRow['brand']): string | null => {
    if (!b) return null;
    return Array.isArray(b) ? (b[0]?.name ?? null) : (b.name ?? null);
  };

  const asArray = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

  // ————————————————— data fetch —————————————————
  const fetchProducts = async (query: string) => {
    setLoading(true);
    const s = query.trim();

    // SELECT-y bez .returns<...>()
    const selectBase = `
      id,
      name,
      thumb_url,
      brand:brands!products_brand_id_fkey ( id, name )
    `;
    const selectWithNew = `
      id,
      name,
      thumb_url,
      is_new,
      brand:brands!products_brand_id_fkey ( id, name )
    `;

    try {
      if (s.length === 0) {
        const sel = hasIsNew ? selectWithNew : selectBase;
        const { data, error } = await supabase
          .from('products')
          .select(sel)
          .order('id', { ascending: true })
          .limit(200);

        if (error) throw error;

        setRows(asArray<ProductRow>(data));
      } else {
        // szukaj przez RPC (nazwa, marka, tagi)
        const { data, error } = await supabase.rpc('search_products', { q: s });
        if (error) throw error;

        // Jeśli RPC nie zwraca is_new, zostanie undefined i badge się nie pokaże.
        const list = asArray<ProductRow>(data).map((r) => ({
          ...r,
          is_new: (r as any).is_new ?? undefined,
        }));
        setRows(list);
      }
    } catch (err: any) {
      alert('Błąd pobierania produktów: ' + (err?.message ?? err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // sonda czy istnieje kolumna products.is_new
  useEffect(() => {
    (async () => {
      const probe = await supabase.from('products').select('is_new').limit(1);
      if (!probe.error) setHasIsNew(true);
    })();
  }, []);

  // startowy fetch + refetch po wykryciu kolumny
  useEffect(() => {
    fetchProducts('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasIsNew]);

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

  // ————————————————— actions —————————————————
  const removeProduct = async (id: number, name: string) => {
    if (!confirm(`Usunąć produkt „${name}”?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Błąd usuwania: ' + error.message);
    else setRows((r) => r.filter((x) => x.id !== id));
  };

  // Ustaw is_new=false (oznacz jako uzupełnione)
  const markCompleted = async (id: number) => {
    if (!hasIsNew) return;
    const { error } = await supabase.from('products').update({ is_new: false }).eq('id', id);
    if (error) {
      alert('Nie udało się zaktualizować statusu: ' + error.message);
      return;
    }
    setRows((list) => list.map((p) => (p.id === id ? { ...p, is_new: false } : p)));
  };

  // Placeholder miniatury – stała, ciemna paleta
  const Thumb = ({ url }: { url: string | null }) =>
    url ? (
      <img
        src={url}
        alt=""
        className="h-12 w-12 rounded-lg border border-slate-700 object-cover shadow-sm"
      />
    ) : (
      <div className="h-12 w-12 rounded-lg border border-slate-700 bg-slate-800" />
    );

  const headerRight = useMemo(
    () => (
      <Link
        href="/products/new"
        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        + Dodaj produkt
      </Link>
    ),
    []
  );

  // ————————————————— render —————————————————
  return (
    <div className="w-full">
      {/* Pasek tytułu strony */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-6">
          <h1 className="text-2xl font-bold text-slate-100">Produkty</h1>
          {headerRight}
        </div>
      </div>

      {/* Karta z treścią */}
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          {/* Wyszukiwarka */}
          <div className="mb-4 flex items-center gap-3">
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-500"
              placeholder="Szukaj po nazwie, marce lub tagach…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {typing && <span className="text-xs text-slate-400">Filtruję…</span>}
          </div>

          {/* Lista */}
          {loading ? (
            <div className="py-10 text-center text-slate-400">Wczytuję…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="text-slate-400">Brak produktów.</div>
              <Link
                href="/products/new"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
              >
                Dodaj pierwszy produkt
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {rows.map((p) => {
                const brandName = getBrandName(p.brand);
                const displayText = `${brandName ?? '—'} — ${p.name}`;
                const showNew = hasIsNew && !!p.is_new;

                return (
                  <li key={p.id} className="flex items-center gap-4 py-3 sm:py-4">
                    <Thumb url={p.thumb_url} />

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${p.id}`}
                        className="truncate text-sm font-semibold text-slate-100 hover:underline sm:text-base"
                        title={displayText}
                      >
                        <span className="text-slate-400">{brandName ?? '—'}</span>{' '}
                        <span className="text-slate-500">—</span>{' '}
                        <span className="text-slate-100">{p.name}</span>
                        {showNew ? (
                          <span className="ml-2 align-middle rounded border border-emerald-600/40 bg-emerald-600/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                            🆕 Nowy
                          </span>
                        ) : null}
                      </Link>

                      <div className="mt-0.5 text-xs text-slate-500">ID: {p.id}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {showNew ? (
                        <button
                          onClick={() => markCompleted(p.id)}
                          className="rounded-lg border border-amber-400/60 bg-transparent px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                          title="Ustaw is_new = false"
                        >
                          Oznacz jako uzupełnione
                        </button>
                      ) : null}

                      <Link
                        href={`/products/${p.id}/edit`}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800"
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
