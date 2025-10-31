'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Brand = { id: number; name: string };
type Ingredient = { id: number; inci_name: string };

export default function NewProductPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngIds, setSelectedIngIds] = useState<number[]>([]);

  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // modale (szybkie dodanie marki/składnika)
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  const [showIngModal, setShowIngModal] = useState(false);
  const [newIngName, setNewIngName] = useState('');

  // pobranie istniejących marek i składników
  useEffect(() => {
    (async () => {
      const [b, i] = await Promise.all([
        supabase.from('brands').select('id,name').order('name'),
        supabase.from('ingredients').select('id,inci_name').order('inci_name'),
      ]);
      if (!b.error) setBrands(b.data ?? []);
      if (!i.error) setIngredients(i.data ?? []);
    })();
  }, []);

  // upload miniatury
  const uploadThumb = async (): Promise<string | null> => {
    if (!file) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `thumbs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('cms').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      alert('Upload błąd: ' + error.message);
      return null;
    }
    const { data } = supabase.storage.from('cms').getPublicUrl(path);
    return data.publicUrl;
  };

  // zapis produktu
  const save = async () => {
    if (!name.trim() || !brandId) {
      alert('Podaj nazwę i wybierz markę.');
      return;
    }

    setSaving(true);
    const thumb_url = await uploadThumb();

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        brand_id: Number(brandId),
        description: description.trim() || null,
        thumb_url,
      })
      .select('id')
      .single();

    if (error || !data) {
      alert('Błąd zapisu: ' + (error?.message ?? ''));
      setSaving(false);
      return;
    }

    // zapisz relacje składników
    if (selectedIngIds.length > 0) {
      const rows = selectedIngIds.map((ingredient_id) => ({
        product_id: data.id,
        ingredient_id,
      }));
      await supabase.from('product_ingredients').insert(rows);
    }

    setSaving(false);
    router.replace('/products');
  };

  // dodaj nową markę
  const addBrand = async () => {
    const v = newBrandName.trim();
    if (!v) return;
    const { data, error } = await supabase
      .from('brands')
      .insert({ name: v, is_new: true })
      .select('id,name,is_new')
      .single();
    if (error) return alert(error.message);
    setBrands((b) => [...b, data].sort((a, c) => a.name.localeCompare(c.name, 'pl')));
    setBrandId(data.id);
    setNewBrandName('');
    setShowBrandModal(false);
  };

  // dodaj nowy składnik
  const addIngredient = async () => {
    const v = newIngName.trim();
    if (!v) return;
    const { data, error } = await supabase
      .from('ingredients')
      .insert({ inci_name: v, is_new: true })
      .select('id,inci_name,is_new')
      .single();
    if (error) return alert(error.message);
    setIngredients((i) => [...i, data].sort((a, c) => a.inci_name.localeCompare(c.inci_name, 'pl')));
    setSelectedIngIds((prev) => [...prev, data.id]);
    setNewIngName('');
    setShowIngModal(false);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Dodaj produkt</h1>
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
            placeholder="np. Ceramide Repair Serum"
          />
        </div>

        {/* Marka + przycisk dodania */}
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
              onClick={() => setShowBrandModal(true)}
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
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis produktu…"
          />
        </div>

        {/* Miniatura */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-300">Miniatura</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white hover:file:bg-slate-600"
          />
        </div>

        {/* Składniki (checkboxy) */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-300">Składniki (INCI)</label>
            <button
              onClick={() => setShowIngModal(true)}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
            >
              + Dodaj składnik
            </button>
          </div>

          <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-slate-600/70 bg-slate-900/30 p-2">
            {ingredients.map((i) => {
              const checked = selectedIngIds.includes(i.id);
              return (
                <label
                  key={i.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedIngIds((prev) =>
                        e.target.checked ? [...prev, i.id] : prev.filter((x) => x !== i.id),
                      );
                    }}
                  />
                  <span className="text-slate-100">{i.inci_name}</span>
                </label>
              );
            })}
            {ingredients.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">Brak dostępnych składników…</div>
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
            {saving ? 'Zapisuję…' : 'Zapisz produkt'}
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
          >
            Anuluj
          </button>
        </div>
      </div>

      {/* ===== Modal dodawania marki ===== */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-800/90 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Nowa marka</h2>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa marki</label>
              <input
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                placeholder="np. GOYAH"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBrandModal(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
              >
                Anuluj
              </button>
              <button
                onClick={addBrand}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal dodawania składnika ===== */}
      {showIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-800/90 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Nowy składnik (INCI)</h2>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-slate-300">Nazwa INCI</label>
              <input
                className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                placeholder="np. AQUA"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowIngModal(false)}
                className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
              >
                Anuluj
              </button>
              <button
                onClick={addIngredient}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
