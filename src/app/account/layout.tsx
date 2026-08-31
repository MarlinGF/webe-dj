'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { MainHeader } from '@/components/main-header';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  if (loading || !user) return null;
  return <div className="flex min-h-screen flex-col"><MainHeader /><main className="container flex-1 py-8">{children}</main></div>;
}
