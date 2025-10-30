'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';


export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const router = useRouter();

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

      if (error || !data || data.role !== 'admin') { router.replace('/login?e=forbidden'); return; }
      setOk(true);
    })();
  }, [router]);
  useEffect(() => {
  (async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) { console.log('NO UID'); router.replace('/login'); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle();

    console.log('profile:', { data, error });

    if (error || !data || data.role !== 'admin') {
      router.replace('/login?e=forbidden'); 
      return;
    }
    setOk(true);
  })();
}, [router]);

  if (!ok) return <div className="p-6">Sprawdzam uprawnienia…</div>;
  return <>{children}</>;
}
