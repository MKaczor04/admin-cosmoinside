'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Brand = { id: number; name: string };
type Ingredient = { id: number; inci_name: string };
type Category = { id: number; name: string; path: string | null };
type Tag = { id: number; name: string; slug: string };

type Product = {
  id: number;
  name: string;
  description: string | null;
  technologist_note: string | null;
  thumb_url: string | null;
  barcode: string | null;
  // UWAGA: brak pola tags — tagi pobieramy z relacji
  brand?: Brand | Brand[] | null;
};

// ładniejszy breadcrumb z path
function formatBreadcrumb(path: string | null, nameFallback: string) {
  const parts = (path ?? '').split('/').filter(Boolean);
  if (!parts.length) return nameFallback;
  return parts
    .map((p) => p.replace(/-/g, ' '))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' › ');
}

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const pid = idStr ? Number(idStr) : NaN;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]); // ← NOWE: tagi z relacji

  const getBrandName = (b: Product['brand']): string | null => {
    if (!b) return null;
    return Array.isArray(b) ? b[0]?.name ?? null : b.name ?? null;
  };

  useEffect(() => {
    if (!idStr || Number.isNaN(pid)) {
      router.replace('/products');
      return;
    }

    (async () => {
      setLoading(true);

      // 1) Produkt + marka (bez kolumny tags)
      const prod = await supabase
        .from('products')
        .select(`
          id, name, description, technologist_note, thumb_url, barcode,
          brand:brands ( id, name )
        `)
        .eq('id', pid)
        .maybeSingle();

      if (prod.error) {
        alert('Błąd pobierania produktu: ' + prod.error.message);
        router.replace('/products');
        return;
      }
      if (!prod.data) {
        alert('Nie znaleziono produktu.');
        router.replace('/products');
        return;
      }

      // 2) Równolegle: składniki, kategorie, tagi (z relacji M:N)
      const [relIng, relCat, relTags] = await Promise.all([
        supabase
          .from('product_ingredients')
          .select(`ingredient:ingredients ( id, inci_name )`)
          .eq('product_id', pid)
          .order('ingredient_id', { ascending: true }),

        supabase
          .from('product_categories')
          .select(`category:categories ( id, name, path )`)
          .eq('product_id', pid)
          .order('category_id', { ascending: true }),

        supabase
          .from('product_tags')
          .select(`tag:tags ( id, name, slug )`)
          .eq('product_id', pid)
          .order('tag_id', { ascending: true }),
      ]);

      const ing: Ingredient[] =
        (relIng.data ?? []).map((r: any) => r.ingredient).filter(Boolean) ?? [];

      const cats: Category[] =
        (relCat.data ?? []).map((r: any) => r.category).filter(Boolean) ?? [];

      const tgs: Tag[] =
        (relTags.data ?? []).map((r: any) => r.tag).filter(Boolean) ?? [];

      setProduct(prod.data as any);
      setIngredients(ing);
      setCategories(cats);
      setTags(tgs);
      setLoading(false);
    })();
  }, [pid, idStr, router]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 text-slate-200 shadow-lg">
          Wczytuję…
        </div>
      </div>
    );
  }

  if (!product) return null;

  const brandName = getBrandName(product.brand);

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      {/* breadcrumbs + tytuł */}
      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">
            <Link href="/products" className="hover:underline">
              Produkty
            </Link>{' '}
            / <span className="text-slate-300">Szczegóły</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            <span className="text-slate-400">{brandName ?? '—'}</span>
            <span className="mx-2 text-slate-600">—</span>
            {product.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700/60"
          >
            Edytuj
          </Link>
        </div>
      </div>

      {/* karta hero */}
      <div className="mb-6 grid gap-6 md:grid-cols-[160px_1fr]">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-3">
          {product.thumb_url ? (
            <img
              src={product.thumb_url}
              alt=""
              className="mx-auto h-36 w-36 rounded-xl border border-slate-700 object-cover"
            />
          ) : (
            <div className="mx-auto h-36 w-36 rounded-xl border border-slate-700 bg-slate-900/40" />
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6">
          {product.description ? (
            <p className="text-sm leading-relaxed text-slate-200">{product.description}</p>
          ) : (
            <p className="text-sm text-slate-400">Brak opisu.</p>
          )}

          {/* Identyfikacja: kod kreskowy */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Identyfikacja
            </div>
            <div className="text-sm text-slate-200">
              <span className="text-slate-400">Kod kreskowy:</span>{' '}
              <span className="font-mono">{product.barcode?.trim() || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SKŁAD (INCI) — TYLKO LISTA NAZW */}
      <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Skład (INCI)</h2>
        {ingredients.length === 0 ? (
          <div className="py-2 text-sm text-slate-400">Brak składników.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing) => (
              <Link
                key={ing.id}
                href={`/ingredients/${ing.id}`}
                className="rounded-full border border-slate-600/70 bg-slate-900/40 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800/60"
                title="Przejdź do karty składnika"
              >
                {ing.inci_name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* KATEGORIE */}
      <div className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Kategorie</h2>
        {categories.length === 0 ? (
          <div className="py-2 text-sm text-slate-400">Brak kategorii.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-slate-600/70 bg-slate-900/40 px-3 py-1 text-sm text-slate-200"
                title={c.path ?? c.name}
              >
                {formatBreadcrumb(c.path, c.name)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* TAGI — z relacji M:N */}
      <div className="mb-12 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Tagi</h2>
        {tags.length === 0 ? (
          <div className="py-2 text-sm text-slate-400">Brak tagów.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-slate-600/70 bg-slate-900/40 px-2.5 py-0.5 text-xs text-slate-200"
                title={t.slug}
              >
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Opinia technologa */}
      {product.technologist_note && (
        <div className="mb-12 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-6">
          <h3 className="mb-2 text-base font-semibold text-slate-100">Opinia technologa</h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
            {product.technologist_note}
          </p>
        </div>
      )}
    </div>
  );
}
