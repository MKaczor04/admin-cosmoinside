'use client';

import AdminGuard from '@/components/AdminGuard';

export default function HomePage() {
  return (
    <AdminGuard>
      <div style={{ padding: 24 }}>
        <h1>Panel administracyjny</h1>
        <p>Jesteś zalogowany jako admin ✅</p>
      </div>
    </AdminGuard>
  );
}