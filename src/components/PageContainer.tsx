'use client';
import type { ReactNode } from 'react';

/**
 * Uniwersalny, wyśrodkowany wrapper dla stron panelu.
 * - centrum: max-w-5xl
 * - responsywne odstępy: px-4 py-6
 * - możesz nadpisać szerokość/className parametrem `className`
 */
export default function PageContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full max-w-5xl mx-auto px-4 py-6 ${className}`}>
      {children}
    </div>
  );
}
