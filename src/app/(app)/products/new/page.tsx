'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type Brand = { id: number; name: string };
type Ingredient = { id: number; inci_name: string };
type Category = { id: number; name: string; path: string };
type Tag = { id: number; name: string; slug: string };

/* ====== POMOCNICZE DO KATEGORII (ładny widok) ====== */
function formatBreadcrumb(path: string, name: string) {
  const parts = (path || '').split('/').filter(Boolean);
  if (!parts.length) return name;
  return parts
    .map((p) => p.replace(/-/g, ' '))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' › ');
}

function groupByRoot(cats: Category[]) {
  const groups: Record<string, Category[]> = {};
  for (const c of cats) {
    const root = (c.path?.split('/')[0] || c.name || 'Inne').replace(/-/g, ' ').toLowerCase();
    const key = root.charAt(0).toUpperCase() + root.slice(1);
    (groups[key] ||= []).push(c);
  }
  const entries = Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0], 'pl'))
    .map(([k, arr]) => [k, arr.sort((a, b) => (a.path || '').localeCompare(b.path || '', 'pl'))] as const);
  return entries;
}

function SearchableCategoryPicker({
  categories,
  selectedIds,
  onChange,
}: {
  categories: Category[];
  selectedIds: number[];
  onChange: (next: number[]) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) => {
      const bc = formatBreadcrumb(c.path, c.name).toLowerCase();
      return c.name.toLowerCase().includes(query) || bc.includes(query);
    });
  }, [categories, q]);

  const groups = useMemo(() => groupByRoot(filtered), [filtered]);

  const toggle = (id: number, checked: boolean) => {
    if (checked) onChange([...new Set([...selectedIds, id])]);
    else onChange(selectedIds.filter((x) => x !== id));
  };

  const visibleIds = filtered.map((c) => c.id);
  const selectAllVisible = () => onChange([...new Set([...selectedIds, ...visibleIds])]);
  const clearVisible = () => onChange(selectedIds.filter((id) => !visibleIds.includes(id)));

  return (
    <div className="rounded-lg border border-slate-600/70 bg-slate-900/30">
      <div className="sticky top-0 z-10 grid gap-2 border-b border-slate-700/60 bg-slate-900/60 p-3 backdrop-blur">
        <input
          className="w-full rounded-md border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
          placeholder="Szukaj kategorii… (np. twarz, krem, noc)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={selectAllVisible}
            className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-700/60"
          >
            Zaznacz widoczne
          </button>
          <button
            type="button"
            onClick={clearVisible}
            className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-700/60"
          >
            Wyczyść widoczne
          </button>
          <span className="ml-auto text-slate-400">
            Wybrano: <b>{selectedIds.length}</b>
          </span>
        </div>
      </div>

      <div className="max-h-72 overflow-auto p-2">
        {groups.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Brak kategorii…</div>}
        <div className="space-y-2">
          {groups.map(([root, items]) => (
            <details key={root} className="rounded-md border border-slate-700/60">
              <summary className="cursor-pointer select-none px-3 py-2 text-slate-200 hover:bg-slate-800/50">
                <span className="font-medium">{root}</span>{' '}
                <span className="text-xs text-slate-400">({items.length})</span>
              </summary>
              <div className="space-y-1 p-2">
                {items.map((c) => {
                  const checked = selectedIds.includes(c.id);
                  const label = formatBreadcrumb(c.path, c.name);
                  return (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/40"
                      title={label}
                    >
                      <input type="checkbox" checked={checked} onChange={(e) => toggle(c.id, e.target.checked)} />
                      <span className="text-slate-100">{label}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NewProductPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedIngIds, setSelectedIngIds] = useState<number[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [technologistNote, setTechnologistNote] = useState(''); // opinia technologa
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // modale
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showIngModal, setShowIngModal] = useState(false);
  const [newIngName, setNewIngName] = useState('');

  // wyszukiwarki
  const [ingQuery, setIngQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');

  const filteredIngredients = useMemo(() => {
    const q = ingQuery.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.inci_name.toLowerCase().includes(q));
  }, [ingredients, ingQuery]);

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tags, tagQuery]);

  // pobranie marek, składników, kategorii, tagów
  useEffect(() => {
    (async () => {
      const [b, i, c, t] = await Promise.all([
        supabase.from('brands').select('id,name').order('name'),
        supabase.from('ingredients').select('id,inci_name').order('inci_name'),
        supabase.from('categories').select('id,name,path').order('path', { ascending: true }),
        supabase.from('tags').select('id,name,slug').order('name'),
      ]);

      if (!b.error) setBrands(b.data ?? []);
      if (!i.error) setIngredients(i.data ?? []);
      if (!c.error) setCategories((c.data ?? []) as Category[]);
      if (!t.error) setTags((t.data ?? []) as Tag[]);
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

  // zapis produktu (+ relacje składników, kategorii, tagów)
  const save = async () => {
    if (!name.trim() || !brandId) {
      alert('Podaj nazwę i wybierz markę.');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      if (!confirm('Nie wybrano żadnej kategorii. Kontynuować?')) return;
    }

    setSaving(true);
    try {
      const thumb_url = await uploadThumb();

      const { data: product, error: insErr } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          brand_id: Number(brandId),
          description: description.trim() || null,
          technologist_note: technologistNote.trim() || null,
          thumb_url,
        })
        .select('id')
        .single();

      if (insErr || !product) {
        throw new Error(insErr?.message || 'Błąd zapisu produktu.');
      }

      // relacje składników
      if (selectedIngIds.length > 0) {
        const rows = selectedIngIds.map((ingredient_id) => ({
          product_id: product.id,
          ingredient_id,
        }));
        const { error: piErr } = await supabase.from('product_ingredients').insert(rows);
        if (piErr) throw new Error('Błąd zapisu składników: ' + piErr.message);
      }

      // relacje kategorii (RPC — omija RLS zgodnie z polityką)
      if (selectedCategoryIds.length > 0) {
        const { error: pcErr } = await supabase.rpc('add_product_categories', {
          p_product_id: product.id,
          p_category_ids: selectedCategoryIds,
        });
        if (pcErr) throw new Error('Błąd zapisu kategorii: ' + pcErr.message);
      }

      // relacje tagów
      if (selectedTagIds.length > 0) {
        const rows = selectedTagIds.map((tag_id) => ({ product_id: product.id, tag_id }));
        const { error: ptErr } = await supabase.from('product_tags').insert(rows);
        if (ptErr) throw new Error('Błąd zapisu tagów: ' + ptErr.message);
      }

      router.replace('/products');
    } catch (e: any) {
      alert(e?.message ?? 'Nieznany błąd zapisu.');
    } finally {
      setSaving(false);
    }
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

        {/* Opinia technologa */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">Opinia technologa</label>
            <span className="text-xs text-slate-400">Premium</span>
          </div>
          <textarea
            className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
            rows={6}
            value={technologistNote}
            onChange={(e) => setTechnologistNote(e.target.value)}
            placeholder="Np. Rekomendacja: cera sucha i reaktywna; zwrócić uwagę na stężenie ceramidów…"
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

        {/* Składniki (ulepszone) */}
        <div className="mb-6 rounded-lg border border-slate-600/70 bg-slate-900/30">
          <div className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/60 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-300">Składniki (INCI)</label>
              <button
                onClick={() => setShowIngModal(true)}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
              >
                + Dodaj składnik
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[240px] grow rounded-md border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                placeholder="Szukaj składnika…"
                value={ingQuery}
                onChange={(e) => setIngQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const visible = filteredIngredients.map((i) => i.id);
                  setSelectedIngIds((prev) => [...new Set([...prev, ...visible])]);
                }}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
                title="Zaznacz wszystkie widoczne"
              >
                Zaznacz widoczne
              </button>
              <button
                type="button"
                onClick={() => {
                  const visible = new Set(filteredIngredients.map((i) => i.id));
                  setSelectedIngIds((prev) => prev.filter((id) => !visible.has(id)));
                }}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
                title="Odznacz wszystkie widoczne"
              >
                Wyczyść widoczne
              </button>
              <span className="ml-auto text-xs text-slate-400">
                Wybrano: <b>{selectedIngIds.length}</b>
              </span>
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-auto p-2">
            {filteredIngredients.map((i) => {
              const checked = selectedIngIds.includes(i.id);
              return (
                <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedIngIds((prev) => (e.target.checked ? [...prev, i.id] : prev.filter((x) => x !== i.id)));
                    }}
                  />
                  <span className="text-slate-100">{i.inci_name}</span>
                </label>
              );
            })}
            {filteredIngredients.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">Brak dostępnych składników…</div>
            )}
          </div>
        </div>

        {/* Kategorie (ładny wybór, breadcrumb + grupy + wyszukiwarka) */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-300">Kategorie (możesz wybrać kilka)</label>
          <SearchableCategoryPicker categories={categories} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
        </div>

        {/* TAGI (multi-select + wyszukiwarka) */}
        <div className="mb-6 rounded-lg border border-slate-600/70 bg-slate-900/30">
          <div className="sticky top-0 z-10 border-b border-slate-700/60 bg-slate-900/60 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-slate-300">Tagi</label>
              {/* brak przycisku dodawania tagu — tagi są z góry zdefiniowane */}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[240px] grow rounded-md border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 outline-none focus:border-slate-400"
                placeholder="Szukaj tagu… (nazwa lub slug)"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const visible = filteredTags.map((t) => t.id);
                  setSelectedTagIds((prev) => [...new Set([...prev, ...visible])]);
                }}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
                title="Zaznacz wszystkie widoczne"
              >
                Zaznacz widoczne
              </button>
              <button
                type="button"
                onClick={() => {
                  const visible = new Set(filteredTags.map((t) => t.id));
                  setSelectedTagIds((prev) => prev.filter((id) => !visible.has(id)));
                }}
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
                title="Odznacz wszystkie widoczne"
              >
                Wyczyść widoczne
              </button>
              <span className="ml-auto text-xs text-slate-400">
                Wybrano: <b>{selectedTagIds.length}</b>
              </span>
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-auto p-2">
            {filteredTags.map((t) => {
              const checked = selectedTagIds.includes(t.id);
              return (
                <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedTagIds((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)));
                    }}
                  />
                  <span className="text-slate-100">
                    <span className="rounded border border-slate-600/70 bg-slate-900/40 px-2 py-0.5 text-xs">#{t.name}</span>
                    <span className="ml-2 text-xs text-slate-500">({t.slug})</span>
                  </span>
                </label>
              );
            })}
            {filteredTags.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Brak tagów…</div>}
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
