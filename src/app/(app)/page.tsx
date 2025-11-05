'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type LatestProduct = {
  id: number;
  name: string;
  thumb_url: string | null;
  brands?: { name: string }[] | { name: string } | null;
};

type Brand = { id: number; name: string; is_new?: boolean | null };
type Ingredient = { id: number; inci_name: string; is_new?: boolean | null };
type ProductLite = { id: number; name: string; is_new?: boolean | null };
type BugLite = { id: number; title: string; status: string; created_at: string };

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({
    products: 0,
    brands: 0,
    ingredients: 0,
    users: 0, // ✅ nowy licznik
  });

  const [latest, setLatest] = useState<LatestProduct[]>([]);
  const [newBrands, setNewBrands] = useState<Brand[]>([]);
  const [newIngs, setNewIngs] = useState<Ingredient[]>([]);
  const [newProducts, setNewProducts] = useState<ProductLite[]>([]);
  const [bugs, setBugs] = useState<BugLite[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Liczniki produktów/marek/składników
      const [p, b, i] = await Promise.all([
        supabase.from('products').select('*', { head: true, count: 'exact' }),
        supabase.from('brands').select('*', { head: true, count: 'exact' }),
        supabase.from('ingredients').select('*', { head: true, count: 'exact' }),
      ]);

      // Licznik użytkowników (na podstawie profiles)
      const u = await supabase.from('profiles').select('*', { head: true, count: 'exact' });

      setCounts({
        products: p.count ?? 0,
        brands: b.count ?? 0,
        ingredients: i.count ?? 0,
        users: u.count ?? 0, // ✅
      });

      // Ostatnio dodane produkty
      const latestP = await supabase
        .from('products')
        .select('id, name, thumb_url, brands(name)')
        .order('id', { ascending: false })
        .limit(5);
      setLatest((latestP.data as LatestProduct[]) ?? []);

      // Nowe marki, składniki, produkty
      const [nb, ni, np] = await Promise.all([
        supabase
          .from('brands')
          .select('id, name, is_new')
          .eq('is_new', true)
          .order('name', { ascending: true }),
        supabase
          .from('ingredients')
          .select('id, inci_name, is_new')
          .eq('is_new', true)
          .order('inci_name', { ascending: true }),
        supabase
          .from('products')
          .select('id, name, is_new')
          .eq('is_new', true)
          .order('name', { ascending: true }),
      ]);
      setNewBrands((nb.data as Brand[]) ?? []);
      setNewIngs((ni.data as Ingredient[]) ?? []);
      setNewProducts((np.data as ProductLite[]) ?? []);

      // ✅ Zgłoszone błędy: tylko otwarte
      const bugsRes = await supabase
        .from('bug_reports')
        .select('id, title, status, created_at')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(8);
      setBugs((bugsRes.data as BugLite[]) ?? []);

      setLoading(false);
    })();
  }, []);

  const brandName = (p: LatestProduct): string => {
    const rel = p.brands;
    if (!rel) return 'Brak marki';
    if (Array.isArray(rel)) return rel[0]?.name ?? 'Brak marki';
    return rel.name ?? 'Brak marki';
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Witaj w panelu CosmoInside</h1>
        <p className="mt-1 text-slate-400">
          Zarządzaj bazą produktów, marek i składników — wszystko w jednym miejscu.
        </p>
      </div>

      {/* Szybkie akcje */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/products/new"
          className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center text-white transition hover:bg-slate-700"
        >
          ➕ Dodaj produkt
        </Link>
        <Link
          href="/brands"
          className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center text-white transition hover:bg-slate-700"
        >
          🏷️ Dodaj markę
        </Link>
        <Link
          href="/ingredients"
          className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center text-white transition hover:bg-slate-700"
        >
          ⚗️ Dodaj składnik
        </Link>
      </div>

      {/* Statystyki */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-slate-100">
            {loading ? '…' : counts.products}
          </div>
          <div className="text-sm text-slate-400">Produktów</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-slate-100">
            {loading ? '…' : counts.brands}
          </div>
          <div className="text-sm text-slate-400">Marek</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-slate-100">
            {loading ? '…' : counts.ingredients}
          </div>
          <div className="text-sm text-slate-400">Składników</div>
        </div>
      </div>

      {/* ✅ Licznik użytkowników (pełna szerokość) */}
      <div className="mb-8">
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-slate-100">
            {loading ? '…' : counts.users}
          </div>
          <div className="text-sm text-slate-400">Zarejestrowanych użytkowników</div>
        </div>
      </div>

      {/* Dwie kolumny: Ostatnio dodane + Do uzupełnienia */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ostatnio dodane produkty */}
        <section className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">Ostatnio dodane produkty</h2>
            <Link
              href="/products"
              className="text-sm font-medium text-slate-300 underline-offset-4 hover:underline"
            >
              Zobacz wszystkie
            </Link>
          </div>

          {loading ? (
            <p className="text-slate-400">Wczytywanie…</p>
          ) : latest.length === 0 ? (
            <p className="text-slate-400">Brak produktów.</p>
          ) : (
            <ul className="divide-y divide-slate-700">
              {latest.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  {p.thumb_url ? (
                    <img
                      src={p.thumb_url}
                      className="h-10 w-10 rounded object-cover border border-slate-600"
                      alt=""
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-slate-700" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-100">{p.name}</div>
                    <div className="text-sm text-slate-400">{brandName(p)}</div>
                  </div>
                  <div className="ml-auto">
                    <Link
                      href={`/products/${p.id}/edit`}
                      className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700/60"
                    >
                      Edytuj
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Do uzupełnienia + Zgłoszone błędy */}
        <section className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Do uzupełnienia</h2>

          {/* Nowe produkty */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-slate-200">
                Nowe produkty <span className="text-slate-400">({newProducts.length})</span>
              </h3>
              <Link
                href="/products"
                className="text-sm font-medium text-slate-300 underline-offset-4 hover:underline"
              >
                Przejdź do produktów
              </Link>
            </div>

            {loading ? (
              <p className="text-slate-400">Wczytywanie…</p>
            ) : newProducts.length === 0 ? (
              <p className="text-slate-500">Brak nowych produktów.</p>
            ) : (
              <ul className="divide-y divide-slate-700">
                {newProducts.slice(0, 6).map((pr) => (
                  <li key={pr.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-100">{pr.name}</span>
                    <Link
                      href={`/products/${pr.id}/edit`}
                      className="rounded-md border border-amber-500 px-3 py-1 text-sm text-amber-300 hover:bg-amber-600/20"
                    >
                      Uzupełnij
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Nowe składniki */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-slate-200">
                Nowe składniki <span className="text-slate-400">({newIngs.length})</span>
              </h3>
              <Link
                href="/ingredients"
                className="text-sm font-medium text-slate-300 underline-offset-4 hover:underline"
              >
                Przejdź do składników
              </Link>
            </div>

            {loading ? (
              <p className="text-slate-400">Wczytywanie…</p>
            ) : newIngs.length === 0 ? (
              <p className="text-slate-500">Brak nowych składników.</p>
            ) : (
              <ul className="divide-y divide-slate-700">
                {newIngs.slice(0, 8).map((ing) => (
                  <li key={ing.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-100">{ing.inci_name}</span>
                    <Link
                      href={`/ingredients/${ing.id}/edit`}
                      className="rounded-md border border-amber-500 px-3 py-1 text-sm text-amber-300 hover:bg-amber-600/20"
                    >
                      Uzupełnij
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Zgłoszone błędy (tylko otwarte) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-slate-200">
                Zgłoszone błędy <span className="text-slate-400">({bugs.length})</span>
              </h3>
              <Link
                href="/account"
                className="text-sm font-medium text-slate-300 underline-offset-4 hover:underline"
              >
                Zgłoś nowy
              </Link>
            </div>

            {loading ? (
              <p className="text-slate-400">Wczytywanie…</p>
            ) : bugs.length === 0 ? (
              <p className="text-slate-500">Brak otwartych zgłoszeń.</p>
            ) : (
              <ul className="divide-y divide-slate-700">
                {bugs.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/bugs/${b.id}`}
                        className="truncate font-medium text-slate-100 hover:underline"
                      >
                        {b.title}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {new Date(b.created_at).toLocaleString()} • {b.status}
                      </div>
                    </div>
                    <Link
                      href={`/bugs/${b.id}`}
                      className="rounded-md border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700/60"
                    >
                      Szczegóły
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Stopka z wersjami */}
      <footer className="mt-10 border-t border-slate-700 pt-4 text-center text-xs text-slate-500">
        <div>Panel administratora CosmoInside • ver 0.3.2</div>
        <div className="text-slate-600 mt-1">Aplikacja CosmoInside • ver 0.1.0</div>
      </footer>
    </div>
  );
}
