'use client';

export default function PageTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">{children}</h1>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
