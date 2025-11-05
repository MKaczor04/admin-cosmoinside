'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Brand = {
  id: number;
  name: string;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Dodawanie
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Edycja
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Wyszukiwarka
  const [q, setQ] = useState('');
  const [typing, setTyping] = useState(false);

  // ===== pobieranie =====
  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('id,name')
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

  // ===== dodawanie z blokadą duplikatu =====
  const addBrand = async () => {
    const name = newName.trim();
    if (!name) return;

    // Sprawdź duplikat (case-insensitive)
    const exists = brands.some(
      (b) => b.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('Taka marka już istnieje.');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert({ name })
        .select('id,name')
        .single();

      if (error) throw error;

      setBrands((prev) =>
        [...prev, data as Brand].sort((a, b) =>
          a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
        )
      );
      setNewName('');
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

  // ===== edycja =====
  const startEdit = (b: Brand) => {
    setEditId(b.id);
    setEditName(b.name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName('');
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (editId === null) return;
    const name = editName.trim();
    if (!name) return;

    // Sprawdź duplikat przy edycji (z wyjątkiem aktualnej marki)
    const exists = brands.some(
      (b) => b.id !== editId && b.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert('Taka marka już istnieje.');
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase.from('brands').update({ name }).eq('id', editId);
      if (error) throw error;

      setBrands((prev) =>
        prev
          .map((b) => (b.id === editId ? { ...b, name } : b))
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
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            placeholder="Nazwa marki"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
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
                <div>
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-700" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-700" />
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
                {/* Nazwa / edycja */}
                {isEditing(b.id) ? (
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      className="w-full rounded-lg border border-slate-600/70 bg-slate-900/50 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
                      placeholder="Nazwa"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
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
                  </div>
                ) : (
                  <div className="min-w-0 leading-tight">
                    <div className="truncate font-semibold text-slate-100">{b.name}</div>
                  </div>
                )}

                {/* Akcje */}
                {!isEditing(b.id) && (
                  <div className="flex flex-wrap items-center gap-2">
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
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
