'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardHeader } from './header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // This is handled by the AuthProvider's loading screen
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
