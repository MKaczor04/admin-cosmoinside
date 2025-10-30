'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Health() {
  const [log, setLog] = useState<string[]>([]);
  const add = (m: string) => setLog((p) => [...p, m]);

  useEffect(() => {
    add(`ENV URL set: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    add(`ENV KEY set: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
    (async () => {
      try {
        const { data, error } = await supabase.from('brands').select('id').limit(1);
        add(`Supabase SELECT brands: ${error ? '❌ ' + error.message : '✅ OK'}`);
      } catch (e:any) {
        add(`Supabase client init error: ❌ ${e.message}`);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Health</h1>
      <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}
