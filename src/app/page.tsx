import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic'; // wyłącz SSG dla login

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const sp = await searchParams;
  const err = typeof sp.e === 'string' ? sp.e : null;
  return <LoginForm err={err} />;
}
