'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { router.replace('/login'); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      if (error || !data || data.role !== 'admin') {
        router.replace('/login'); // możesz dodać ?e=forbidden, jeśli używasz wariantu B
        return;
      }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <div className="p-6">Sprawdzam uprawnienia…</div>;
  return <>{children}</>;
}

