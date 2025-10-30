import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic'; // wyłącz SSG dla login

export default function LoginPage({
  searchParams,
}: { searchParams?: { e?: string } }) {
  const err = typeof searchParams?.e === 'string' ? searchParams!.e : null;
  return <LoginForm err={err} />;
}
