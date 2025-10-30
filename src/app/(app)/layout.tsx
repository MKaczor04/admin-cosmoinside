'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AdminGuard from '@/components/AdminGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname?.startsWith(href);
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded ${active ? 'bg-slate-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <AdminGuard>
      <div className="min-h-screen grid grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="font-bold">CosmoInside • Admin</span>
            <nav className="ml-4 flex gap-2">
              <NavLink href="/" label="Start" />
              <NavLink href="/brands" label="Marki" />
              <NavLink href="/products" label="Produkty" />
            </nav>
          </div>
          <button onClick={logout} className="rounded bg-slate-900 px-3 py-2 text-white">
            Wyloguj
          </button>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </AdminGuard>
  );
}
