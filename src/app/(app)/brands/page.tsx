'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Brand = {
  id: number;
  name: string;
  url_logo: string | null;
  is_new?: boolean;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Dodawanie
  const [newName, setNewName] = useState('');
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // Edycja
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Wyszukiwarka
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);

  // ===== helpers: upload logo do Storage =====
  async function uploadBrandLogo(file: File): Promise<string> {
    // Upewnij się, że masz bucket "brand-logos" (publiczny)
    const ext = file.name.split('.').pop() || 'png';
    const path = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('brand-logos')
      .upload(path, file, { cacheControl: '3600', upsert: true });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from('brand-logos').getPublicUrl(path);
    return data.publicUrl;
  }

  // ===== pobieranie =====
  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('id,name,url_logo,is_new')
      .order('name', { ascending: true });

    if (error) {
      alert('Błąd pobierania marek: ' + error.message);
      setBrands([]);
    } else {
      setBrands((data as Brand[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // ===== dodawanie =====
  const addBrand = async () => {
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    try {
      let url_logo: string | null = null;
      if (newLogoFile) {
        url_logo = await uploadBrandLogo(newLogoFile);
      }

      const { data, error } = await supabase
        .from('brands')
        .insert({ name, url_logo, is_new: true })
        .select('id,name,url_logo,is_new')
        .single();

      if (error) throw error;

      setBrands((prev) =>
        [...prev, data as Brand].sort((a, b) =>
          a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
        )
      );
      setNewName('');
      setNewLogoFile(null);
    } catch (e: any) {
      alert('Nie udało się dodać marki: ' + e.message);
    } finally {
      setAdding(false);
    }
  };

  // ===== usuwanie =====
  const deleteBrand = async (id: number) => {
    if (!confirm('Na pewno usunąć tę markę?')) return;
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) return alert(error.message);
    setBrands((prev) => prev.filter((b) => b.id !== id));
    if (editId === id) cancelEdit();
  };

  // ===== oznacz jako uzupełnione =====
  const markBrandReviewed = async (id: number) => {
    const { error } = await supabase
      .from('brands')
      .update({ is_new: false })
      .eq('id', id);

    if (error) return alert(error.message);
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, is_new: false } : b)));
  };

  // ===== edycja =====
  const startEdit = (b: Brand) => {
    setEditId(b.id);
    setEditName(b.name);
    setEditLogoFile(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setEditLogoFile(null);
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (editId === null) return;
    const name = editName.trim();
    if (!name) return;

    setSavingEdit(true);
    try {
      let url_logo: string | undefined;
      if (editLogoFile) {
        url_logo = await uploadBrandLogo(editLogoFile);
      }

      const payload: any = { name };
      if (typeof url_logo !== 'undefined') payload.url_logo = url_logo;

      const { error } = await supabase.from('brands').update(payload).eq('id', editId);
      if (error) throw error;

      setBrands((prev) =>
        prev
          .map((b) => (b.id === editId ? { ...b, name, url_logo: url_logo ?? b.url_logo } : b))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' }))
      );
      cancelEdit();
    } catch (e: any) {
      alert('Nie udało się zapisać zmian: ' + e.message);
      setSavingEdit(false);
    }
  };

  // ===== filtrowanie (debounce UX) =====
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(s));
  }, [q, brands]);

  useEffect(() => {
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 200);
    return () => clearTimeout(t);
  }, [q]);

  const empty = !loading && filtered.length === 0;
  const isEditing = (id: number) => editId === id;

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      {/* Nagłówek */}
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Marki</h1>
      </div>

      {/* Karta */}
      <div className="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4 shadow-lg backdrop-blur">
        {/* Wyszukiwarka */}
        <input
          className="mb-3 w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
          placeholder="Szukaj marki…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {typing && <p className="mb-3 text-xs text-slate-400">Filtruję…</p>}

        {/* Dodawanie */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            placeholder="Nazwa marki"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 truncate rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100">
            <span className="truncate">
              {newLogoFile ? newLogoFile.name : 'Wgraj logo (opcjonalnie)'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setNewLogoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={addBrand}
            disabled={adding}
            className="rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
          >
            {adding ? 'Dodaję…' : 'Dodaj'}
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-md bg-slate-700" />
                  <div>
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-700" />
                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-700" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 animate-pulse rounded bg-slate-700" />
                  <div className="h-8 w-14 animate-pulse rounded bg-slate-700" />
                </div>
              </li>
            ))}
          </ul>
        ) : empty ? (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-6 text-center text-slate-300">
            Brak wyników.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Lewa część: logo + nazwa / edycja */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-800">
                    {isEditing(b.id) ? (
                      editLogoFile ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={URL.createObjectURL(editLogoFile)}
                        />
                      ) : b.url_logo ? (
                        <img alt="" className="h-full w-full object-cover" src={b.url_logo} />
                      ) : null
                    ) : b.url_logo ? (
                      <img alt="" className="h-full w-full object-cover" src={b.url_logo} />
                    ) : null}
                  </div>

                  {isEditing(b.id) ? (
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
                        placeholder="Nazwa"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <label className="w-full cursor-pointer truncate rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100">
                        <span className="truncate">
                          {editLogoFile ? editLogoFile.name : 'Wgraj nowe logo…'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setEditLogoFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="min-w-0 leading-tight">
                      <div className="truncate font-semibold text-slate-100">{b.name}</div>
                      {b.is_new && (
                        <span className="mt-1 inline-flex rounded bg-amber-600/30 px-2 py-0.5 text-xs text-amber-300">
                          NOWA
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Prawa część: akcje */}
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing(b.id) ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={savingEdit}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {savingEdit ? 'Zapisuję…' : 'Zapisz'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
                      >
                        Anuluj
                      </button>
                    </>
                  ) : (
                    <>
                      {b.is_new && (
                        <button
                          onClick={() => markBrandReviewed(b.id)}
                          className="rounded-md border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-500/10"
                        >
                          Oznacz jako uzupełnione
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(b)}
                        className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700/60"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => deleteBrand(b.id)}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                      >
                        Usuń
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
