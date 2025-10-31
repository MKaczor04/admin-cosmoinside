'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AdminGuard from '@/components/AdminGuard';
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`rounded px-3 py-2 text-sm transition-colors ${
          active
            ? 'bg-slate-800 text-white'
            : 'text-slate-200 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <AdminGuard>
      <div className="min-h-screen grid grid-rows-[auto_1fr] bg-black text-white">
        <Navbar />

        {/* CONTENT – wyśrodkowany */}
        <main className="flex w-full justify-center px-4 py-6">
          <div className="w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </AdminGuard>
  );
}
