
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, SlidersHorizontal, LayoutDashboard } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
    { href: '/controls', label: 'Controls', icon: SlidersHorizontal },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function MainHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
            <Link href="/controls" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Music className="h-7 w-7" />
              <h1 className="hidden font-headline text-3xl sm:block">ArtistLive</h1>
            </Link>
            <nav className="flex items-center gap-2">
                {navLinks.map((link) => (
                    <Button 
                        key={link.href} 
                        variant="ghost" 
                        asChild
                        className={cn(
                            'gap-2',
                            pathname !== link.href && 'text-muted-foreground'
                        )}
                    >
                        <Link href={link.href}>
                            <link.icon className="h-4 w-4" />
                            {link.label}
                        </Link>
                    </Button>
                ))}
            </nav>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
