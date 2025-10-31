'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Cat = { id: number; name: string; slug: string; parent_id: number | null; depth: number; path: string };

type Props = {
  value: number[];                  // lista wybranych category_id (pozwala na multi-select)
  onChange: (ids: number[]) => void;
  single?: boolean;                 // jeśli true: pozwól wybrać tylko jedną kategorię
};

export default function CategoryPicker({ value, onChange, single = false }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,slug,parent_id,depth,path')
        .eq('is_active', true)
        .order('depth', { ascending: true })
        .order('path', { ascending: true });
      if (!error) setCats(data ?? []);
      setLoading(false);
    })();
  }, []);

  const roots = useMemo(() => cats.filter(c => c.depth === 0), [cats]);
  const byParent = useMemo(() => {
    const m = new Map<number, Cat[]>();
    cats.forEach(c => {
      if (c.parent_id != null) {
        const arr = m.get(c.parent_id) ?? [];
        arr.push(c);
        m.set(c.parent_id, arr);
      }
    });
    // porządek alfabetyczny w obrębie rodzica
    m.forEach(arr => arr.sort((a,b)=>a.name.localeCompare(b.name, 'pl', {sensitivity:'base'})));
    return m;
  }, [cats]);

  const isChecked = (id: number) => value.includes(id);
  const toggle = (id: number) => {
    if (single) {
      onChange(isChecked(id) ? [] : [id]);
    } else {
      onChange(isChecked(id) ? value.filter(x=>x!==id) : [...value, id]);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Ładuję kategorie…</div>;
  if (cats.length === 0) return <div className="text-sm text-slate-400">Brak kategorii.</div>;

  return (
    <div className="space-y-3 rounded-lg border border-slate-600/70 bg-slate-900/30 p-3">
      {roots.map(root => {
        const lvl1 = byParent.get(root.id) ?? [];
        return (
          <div key={root.id} className="rounded-md bg-slate-800/40">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-800/60">
              <input
                type={single ? 'radio' : 'checkbox'}
                checked={isChecked(root.id)}
                onChange={() => toggle(root.id)}
              />
              <span className="font-semibold text-slate-100">{root.name}</span>
            </label>

            {lvl1.length > 0 && (
              <div className="pl-6">
                {lvl1.map(l1 => {
                  const lvl2 = byParent.get(l1.id) ?? [];
                  return (
                    <div key={l1.id} className="rounded-md">
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50">
                        <input
                          type={single ? 'radio' : 'checkbox'}
                          checked={isChecked(l1.id)}
                          onChange={() => toggle(l1.id)}
                        />
                        <span className="text-slate-100">{l1.name}</span>
                      </label>

                      {lvl2.length > 0 && (
                        <div className="pl-6">
                          {lvl2.map(l2 => (
                            <label
                              key={l2.id}
                              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-800/40"
                            >
                              <input
                                type={single ? 'radio' : 'checkbox'}
                                checked={isChecked(l2.id)}
                                onChange={() => toggle(l2.id)}
                              />
                              <span className="text-slate-100">{l2.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
