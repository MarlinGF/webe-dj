import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { UserNav } from '@/components/user-nav';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Clapperboard className="h-7 w-7" />
          <h1 className="font-headline text-3xl">We-Be Live</h1>
        </Link>
        <UserNav />
      </div>
    </header>
  );
}
