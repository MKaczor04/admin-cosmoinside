'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const links = [
    { href: '/', label: 'Start' },
    { href: '/brands', label: 'Marki' },
    { href: '/ingredients', label: 'Składniki' },
    { href: '/products', label: 'Produkty' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
        {/* Lewa sekcja — logo / nazwa */}
        <div className="text-2xl font-semibold text-slate-100 tracking-wide">
          CosmoInside
          <span className="ml-3 text-base font-normal text-slate-400">
            Panel administratora
          </span>
        </div>

        {/* Środkowa sekcja — menu stron */}
        <div className="flex flex-1 justify-center items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-5 py-2.5 text-base font-medium transition-all ${
                pathname === link.href
                  ? 'bg-slate-800 text-white shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Prawa sekcja — przyciski użytkownika */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <Link
                href="/account"
                className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-base font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Konto
              </Link>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-base font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                Wyloguj
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
