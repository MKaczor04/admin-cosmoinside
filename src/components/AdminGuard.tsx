'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    async function check(session: Session | null) {
      const uid = session?.user?.id;
      if (!uid) {
        setOk(false);
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

      console.log('profile:', { data, error });

      if (error || !data || data.role !== 'admin') {
        setOk(false);
        router.replace('/login');
        return;
      }
      setOk(true);
    }

    (async () => {
      // 1) natychmiastowa próba
      const { data } = await supabase.auth.getSession();
      await check(data.session);

      // 2) nasłuch zmian sesji (ZWRACA data.subscription)
      const { data: authListener } = supabase.auth.onAuthStateChange((_evt, session) => {
        check(session);
      });

      // cleanup
      return () => {
        authListener?.subscription?.unsubscribe();
      };
    })();
  }, [router]);

  if (ok === null) return <div className="p-6">Sprawdzam uprawnienia…</div>;
  if (!ok) return null;
  return <>{children}</>;
}
