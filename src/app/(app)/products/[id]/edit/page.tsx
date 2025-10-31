'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { deleteByPublicUrl } from '@/lib/storageUtils';

type Brand = { id: number; name: string };
type Ingredient = { id: number; inci_name: string };

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pid = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // product fields
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // refs
  const [brands, setBrands] = useState<Brand[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngIds, setSelectedIngIds] = useState<number[]>([]);
  const [ingQuery, setIngQuery] = useState('');

  // modale
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [ingModalOpen, setIngModalOpen] = useState(false);

  // modal: brand
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState<File | null>(null);
  const [addingBrand, setAddingBrand] = useState(false);

  // modal: ingredient
  const [newInci, setNewInci] = useState('');
  const [newFunctionsCsv, setNewFunctionsCsv] = useState('');
  const [newSafety, setNewSafety] = useState<number | ''>('');
  const [addingIng, setAddingIng] = useState(false);

  const filteredIngredients = useMemo(() => {
    const q = ingQuery.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.inci_name.toLowerCase().includes(q));
  }, [ingQuery, ingredients]);

  // ===== helpers =====
  const uploadBrandLogo = async (logo: File): Promise<string> => {
    const ext = logo.name.split('.').pop() || 'png';
    const path = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await supabase.storage.from('brand-logos').upload(path, logo, {
      cacheControl: '3600',
      upsert: true,
    });
    if (up.error) throw up.error;
    const { data } = supabase.storage.from('brand-logos').getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadThumbIfAny = async (): Promise<string | null> => {
    if (!file) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `thumbs/${pid}_${Date.now()}.${ext}`;
    const up = await supabase.storage.from('cms').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (up.error) {
      alert('Błąd uploadu: ' + up.error.message);
      return null;
    }
    const { data } = supabase.storage.from('cms').getPublicUrl(path);
    return data.publicUrl;
  };

  const toArray = (csv: string) => {
    const arr = csv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : null;
  };

  // ===== init =====
  useEffect(() => {
    (async () => {
      setLoading(true);

      const b = await supabase.from('brands').select('id,name').order('name');
      setBrands(b.data ?? []);

      const ing = await supabase.from('ingredients').select('id, inci_name').order('inci_name');
      setIngredients(ing.data ?? []);

      const prod = await supabase
        .from('products')
        .select(
          `
          id, name, description, thumb_url, brand_id,
          product_ingredients ( ingredient_id )
        `
        )
        .eq('id', pid)
        .maybeSingle();

      if (prod.error || !prod.data) {
        alert('Nie znaleziono produktu');
        router.replace('/products');
        return;
      }

      const p = prod.data as any;
      setName(p.name ?? '');
      setBrandId(p.brand_id ?? '');
      setDescription(p.description ?? '');
      setThumbUrl(p.thumb_url ?? null);
      setSelectedIngIds((p.product_ingredients ?? []).map((x: any) => x.ingredient_id));

      setLoading(false);
    })();
  }, [pid, router]);

  // ===== save product =====
  const save = async () => {
    if (!name.trim() || !brandId) {
      alert('Podaj nazwę i wybierz markę');
      return;
    }

    setSaving(true);
    try {
      // 1) Miniatura
      let newThumb = thumbUrl;
      if (file) {
        const uploaded = await uploadThumbIfAny();
        if (uploaded) {
          if (thumbUrl) await deleteByPublicUrl(thumbUrl);
          newThumb = uploaded;
        }
      }

      // 2) Update produktu
      const upd = await supabase
        .from('products')
        .update({
          name: name.trim(),
          brand_id: Number(brandId),
          description: description.trim() || null,
          thumb_url: newThumb,
        })
        .eq('id', pid);
      if (upd.error) throw upd.error;

      // 3) Relacje składników
      const current = await supabase
        .from('product_ingredients')
        .select('ingredient_id')
        .eq('product_id', pid);
      if (current.error) throw current.error;

      const currentIds = new Set((current.data ?? []).map((r) => r.ingredient_id));
      const desired = new Set(selectedIngIds);

      const toAdd = [...desired].filter((x) => !currentIds.has(x));
      const toRemove = [...currentIds].filter((x) => !desired.has(x));

      if (toAdd.length) {
        const ins = toAdd.map((ingredient_id) => ({ product_id: pid, ingredient_id }));
        const res = await supabase.from('product_ingredients').insert(ins);
        if (res.error) throw res.error;
      }

      if (toRemove.length) {
        const res = await supabase
          .from('product_ingredients')
          .delete()
          .eq('product_id', pid)
          .in('ingredient_id', toRemove);
        if (res.error) throw res.error;
      }

      alert('Zapisano ✅');
      router.replace('/products');
    } catch (e: any) {
      alert('Błąd zapisu: ' + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  // ===== add brand (modal) =====
  const addBrand = async () => {
    const nm = newBrandName.trim();
    if (!nm) {
      alert('Podaj nazwę marki.');
      return;
    }
    setAddingBrand(true);
    try {
      let url_logo: string | null = null;
      if (newBrandLogo) {
        url_logo = await uploadBrandLogo(newBrandLogo);
      }
      const { data, error } = await supabase
        .from('brands')
        .insert({ name: nm, url_logo, is_new: true })
        .select('id,name')
        .single();
      if (error) throw error;

      setBrands((prev) => [...prev, data as Brand].sort((a, b) => a.name.localeCompare(b.name, 'pl')));
      setBrandId((data as Brand).id);
      setNewBrandName('');
      setNewBrandLogo(null);
      setBrandModalOpen(false);
    } catch (e: any) {
      alert('Nie udało się dodać marki: ' + e.message);
    } finally {
      setAddingBrand(false);
    }
  };

  // ===== add ingredient (modal) =====
  const addIngredient = async () => {
    const inci_name = newInci.trim();
    if (!inci_name) {
      alert('Podaj nazwę INCI.');
      return;
    }
    setAddingIng(true);
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          inci_name,
          functions: toArray(newFunctionsCsv),
          safety_level: newSafety === '' ? null : Math.max(0, Math.min(5, Number(newSafety))),
          is_new: true,
        })
        .select('id, inci_name')
        .single();
      if (error) throw error;

      setIngredients((prev) =>
        [...prev, data as Ingredient].sort((a, b) => a.inci_name.localeCompare(b.inci_name, 'pl'))
      );
      setSelectedIngIds((prev) => [...prev, (data as Ingredient).id]);
      setNewInci('');
      setNewFunctionsCsv('');
      setNewSafety('');
      setIngModalOpen(false);
    } catch (e: any) {
      alert('Nie udało się dodać składnika: ' + e.message);
    } finally {
      setAddingIng(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 text-slate-200 shadow-lg">
          Wczytuję…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Edytuj produkt</h1>
      </div>

      {/* Karta formularza */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 shadow-lg backdrop-blur">
        {/* Nazwa */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa</label>
          <input
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Marka + przycisk „Dodaj markę” */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Marka</label>
            <select
              className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— wybierz —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setBrandModalOpen(true)}
              className="h-[42px] w-full rounded-md border border-slate-600 px-3 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
            >
              + Dodaj markę
            </button>
          </div>
        </div>

        {/* Opis */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-300">Opis</label>
          <textarea
            rows={5}
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Miniatura */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-300">Miniatura</label>
          {thumbUrl ? (
            <img
              src={thumbUrl}
              className="mb-2 h-16 w-16 rounded-md border border-slate-700 object-cover"
              alt=""
            />
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white hover:file:bg-slate-600"
          />
        </div>

        {/* Składniki + przycisk „Dodaj składnik” */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-300">Składniki (INCI)</label>
            <button
              type="button"
              onClick={() => setIngModalOpen(true)}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
            >
              + Dodaj składnik
            </button>
          </div>

          <input
            className="mb-2 w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            placeholder="Szukaj składnika…"
            value={ingQuery}
            onChange={(e) => setIngQuery(e.target.value)}
          />
          <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-slate-600/70 bg-slate-900/30 p-2">
            {filteredIngredients.map((i) => {
              const checked = selectedIngIds.includes(i.id);
              return (
                <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedIngIds((prev) => {
                        if (e.target.checked) return [...prev, i.id];
                        return prev.filter((x) => x !== i.id);
                      });
                    }}
                  />
                  <span className="text-slate-100">{i.inci_name}</span>
                </label>
              );
            })}
            {filteredIngredients.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">Brak wyników…</div>
            )}
          </div>
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

      {/* ===== Modal: Dodaj markę ===== */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-800/90 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Dodaj markę</h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa marki</label>
              <input
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-300">Logo (opcjonalnie)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewBrandLogo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white hover:file:bg-slate-600"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBrandModalOpen(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
              >
                Anuluj
              </button>
              <button
                onClick={addBrand}
                disabled={addingBrand}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
              >
                {addingBrand ? 'Dodaję…' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Dodaj składnik ===== */}
      {ingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-800/90 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Dodaj składnik</h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa INCI</label>
              <input
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                value={newInci}
                onChange={(e) => setNewInci(e.target.value)}
                placeholder="np. AQUA"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-300">Funkcje (CSV)</label>
              <input
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                value={newFunctionsCsv}
                onChange={(e) => setNewFunctionsCsv(e.target.value)}
                placeholder="np. humectant, solvent"
              />
              <p className="mt-1 text-xs text-slate-400">
                Wpisz po przecinku, np.: <span className="font-mono">humectant, solvent</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-300">Poziom bezpieczeństwa</label>
              <select
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                value={newSafety}
                onChange={(e) => setNewSafety(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">— brak —</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIngModalOpen(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
              >
                Anuluj
              </button>
              <button
                onClick={addIngredient}
                disabled={addingIng}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
              >
                {addingIng ? 'Dodaję…' : 'Dodaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
