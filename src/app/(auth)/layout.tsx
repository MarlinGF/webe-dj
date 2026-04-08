import { Music } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
                <Music className="h-8 w-8" />
                <h1 className="font-headline text-4xl">We-Be DJ</h1>
            </Link>
        </div>
        {children}
      </div>
    </main>
  );
}