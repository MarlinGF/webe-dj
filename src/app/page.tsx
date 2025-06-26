'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Clapperboard } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Clapperboard className="h-16 w-16 animate-pulse text-primary" />
        <p className="mt-4 text-lg font-semibold text-primary">Loading We-Be Live...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
          <Clapperboard className="h-7 w-7" />
          <h1 className="font-headline text-3xl">We-Be Live</h1>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center bg-background p-8 text-center">
        <div className="relative mb-8">
            <Mic className="h-48 w-48 text-primary/10" />
            <div className="absolute inset-0 flex items-center justify-center">
                <Clapperboard className="h-24 w-24 text-primary" />
            </div>
        </div>
        <h2 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-primary">Your Stage, Your Rules</h2>
        <p className="mt-4 max-w-2xl text-lg text-foreground/80">
          We-Be Live gives you the tools to stream your passion to the world. From your browser or OBS, connect with your audience, and build your community.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Start Streaming Free</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Go live in minutes.</p>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} We-Be Live. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
