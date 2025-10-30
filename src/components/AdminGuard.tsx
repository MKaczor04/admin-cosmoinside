'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      console.log('[Guard] Session =', session);

      if (!session) { router.replace('/login'); return; }

      const { data: profile, error } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();

      console.log('[Guard] Profil =', profile, 'error =', error);

      if (error || profile?.role !== 'admin') { router.replace('/login?e=forbidden'); return; }

      setAllowed(true);
      setChecking(false);
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!sess) router.replace('/login');
    });
    return () => sub?.subscription.unsubscribe();
  }, [router]);

  if (checking) return <div className="p-6">🔐 Sprawdzam uprawnienia…</div>;
  if (!allowed) return null;
  return <>{children}</>;
}
