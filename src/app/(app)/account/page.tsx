// app/account/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  display_name: string | null;
  role: string | null;
  avatar_url: string | null;
  preferred_locale: string | null; // 'pl' | 'en' | null
  landing_route: string | null;    // '/', '/products', '/brands', '/ingredients'
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 md:p-6 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
    {children}
  </div>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-4 text-lg md:text-xl font-semibold tracking-tight">{children}</h2>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-sm text-slate-300">{children}</label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      'w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-slate-600 ' +
      (props.className ?? '')
    }
  />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      'w-full rounded-lg border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-slate-600 ' +
      (props.className ?? '')
    }
  />
);

const Btn = ({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' }) => {
  const variant = (rest as any).variant ?? 'primary';
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-slate-700 hover:bg-slate-600 text-white'
      : variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'border border-slate-600 text-slate-100 hover:bg-slate-800/60';
  const { variant: _v, className, ...restBtn } = rest as any;
  return (
    <button {...(restBtn as any)} className={`${base} ${styles} ${className ?? ''}`}>
      {children}
    </button>
  );
};

// prosty helper do usuwania starego avatara po URL (bucket: cms)
async function deleteByPublicUrl(publicUrl: string) {
  try {
    const u = new URL(publicUrl);
    // /storage/v1/object/public/<bucket>/<path>
    const parts = u.pathname.split('/').filter(Boolean);
    const bucket = parts[parts.indexOf('public') + 1];
    const path = parts.slice(parts.indexOf(bucket) + 1).join('/');
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    /* ignore */
  }
}

export default function AccountPage() {
  const router = useRouter();

  // user
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  // profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // settings
  const [locale, setLocale] = useState<string>('pl');
  const [landing, setLanding] = useState<string>('/');

  // security
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const canChangePwd = useMemo(() => pwd1.length >= 8 && pwd1 === pwd2, [pwd1, pwd2]);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // INIT
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: udata, error: uerr } = await supabase.auth.getUser();
      if (uerr || !udata.user) {
        router.replace('/login');
        return;
      }

      setUserId(udata.user.id);
      setEmail(udata.user.email ?? '');
      setLastSignIn(udata.user.last_sign_in_at ?? null);

      // pobierz profil
      const { data: p, error: perr } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, preferred_locale, landing_route')
        .eq('id', udata.user.id)
        .maybeSingle();

      if (!perr && p) {
        const prof = p as Profile;
        setProfile(prof);
        setDisplayName(prof.display_name ?? '');
        setRole(prof.role ?? null);
        setAvatarUrl(prof.avatar_url ?? null);
        setLocale(prof.preferred_locale ?? 'pl');
        setLanding(prof.landing_route ?? '/');
      }

      setLoading(false);
    })();
  }, [router]);

  // upload avatara do bucketa "cms" (folder avatars/)
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `avatars/${userId}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('cms') // ← jeśli używasz innego bucketa na pliki panelu, podmień tutaj
      .upload(path, avatarFile, { cacheControl: '3600', upsert: false });

    if (error) {
      alert('Błąd wgrywania avatara: ' + error.message);
      return null;
    }
    const { data } = supabase.storage.from('cms').getPublicUrl(path); // ← oraz tutaj
    return data.publicUrl;
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    try {
      let newAvatar: string | undefined;

      if (avatarFile) {
        const uploaded = await uploadAvatar();
        if (uploaded) {
          if (avatarUrl) await deleteByPublicUrl(avatarUrl);
          newAvatar = uploaded;
        }
      }

      const updatePayload: Partial<Profile> = {
        display_name: displayName.trim() || null,
      };
      if (typeof newAvatar !== 'undefined') updatePayload.avatar_url = newAvatar;

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      if (error) throw error;

      setAvatarUrl(newAvatar ?? avatarUrl);
      alert('Zapisano profil ✅');
    } catch (e: any) {
      alert('Błąd zapisu profilu: ' + (e?.message ?? e));
    } finally {
      setSavingProfile(false);
      setAvatarFile(null);
    }
  };

  const saveSettings = async () => {
    if (!userId) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_locale: locale,
          landing_route: landing,
        })
        .eq('id', userId);

      if (error) throw error;
      alert('Zapisano ustawienia ✅');
    } catch (e: any) {
      alert('Błąd zapisu ustawień: ' + (e?.message ?? e));
    } finally {
      setSavingSettings(false);
    }
  };

  const changePassword = async () => {
    if (!canChangePwd) return;
    setChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      setPwd1('');
      setPwd2('');
      alert('Hasło zmienione ✅');
    } catch (e: any) {
      alert('Błąd zmiany hasła: ' + (e?.message ?? e));
    } finally {
      setChangingPwd(false);
    }
  };

  const signOutEverywhere = async () => {
    try {
      // globalne wylogowanie (Supabase JS v2)
      await supabase.auth.signOut({ scope: 'global' as any });
      router.replace('/login');
    } catch (e: any) {
      alert('Nie udało się wylogować ze wszystkich urządzeń: ' + (e?.message ?? e));
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6 text-slate-300">Wczytuję…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Konto</h1>
        <p className="mt-1 text-sm text-slate-400">
          Zarządzaj swoim profilem, bezpieczeństwem i preferencjami pracy w panelu.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* PROFIL */}
        <Card>
          <H2>Profil</H2>

          <div className="mb-4 grid grid-cols-[64px_1fr] gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-800 bg-slate-800/50">
              {avatarFile ? (
                <Image
                  alt="avatar"
                  src={URL.createObjectURL(avatarFile)}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : avatarUrl ? (
                <Image alt="avatar" src={avatarUrl} fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm">
                  —
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Zdjęcie profilowe</Label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white hover:file:bg-slate-600"
              />
            </div>
          </div>

          <div className="mb-3">
            <Label>Wyświetlana nazwa</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div>
              <Label>Adres e-mail</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label>Rola</Label>
              <Input value={role ?? '—'} disabled />
            </div>
          </div>

          <div className="flex gap-2">
            <Btn onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Zapisuję…' : 'Zapisz profil'}
            </Btn>
            {lastSignIn && (
              <span className="ml-auto self-center text-xs text-slate-400">
                Ostatnie logowanie: {new Date(lastSignIn).toLocaleString()}
              </span>
            )}
          </div>
        </Card>

        {/* BEZPIECZEŃSTWO */}
        <Card>
          <H2>Bezpieczeństwo</H2>

          <div className="mb-3">
            <Label>Nowe hasło</Label>
            <Input
              type="password"
              placeholder="minimum 8 znaków"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <Label>Powtórz hasło</Label>
            <Input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
            />
            {!canChangePwd && (pwd1.length > 0 || pwd2.length > 0) && (
              <p className="mt-1 text-xs text-amber-300">
                Hasła muszą być identyczne i mieć min. 8 znaków.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn onClick={changePassword} disabled={!canChangePwd || changingPwd}>
              {changingPwd ? 'Zmieniam…' : 'Zmień hasło'}
            </Btn>
            <Btn variant="outline" onClick={signOutEverywhere}>
              Wyloguj z wszystkich urządzeń
            </Btn>
          </div>
        </Card>

        {/* USTAWIENIA PANELU */}
        <Card>
          <H2>Ustawienia panelu</H2>

          <div className="mb-3">
            <Label>Język</Label>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </Select>
          </div>

          <div className="mb-6">
            <Label>Domyślna strona po zalogowaniu</Label>
            <Select value={landing} onChange={(e) => setLanding(e.target.value)}>
              <option value="/">Start</option>
              <option value="/products">Produkty</option>
              <option value="/brands">Marki</option>
              <option value="/ingredients">Składniki</option>
            </Select>
          </div>

          <Btn onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? 'Zapisuję…' : 'Zapisz ustawienia'}
          </Btn>
        </Card>

        {/* DANE TECHNICZNE / O APLIKACJI */}
        <Card>
          <H2>Informacje techniczne</H2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex justify-between">
              <span>Wersja aplikacji (mobile/web):</span>
              <span className="font-medium">0.1.0</span>
            </li>
            <li className="flex justify-between">
              <span>Wersja panelu administratora:</span>
              <span className="font-medium">ver 0.2.0</span>
            </li>
            <li className="flex justify-between">
              <span>Twoje ID użytkownika:</span>
              <span className="font-mono text-slate-400">{userId}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Jeżeli zauważysz błąd lub masz propozycję zmiany – daj znać. 👍
          </p>
        </Card>
      </div>
    </div>
  );
}
