'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth } from '@/lib/firebase';
import { deleteLocalLibrary } from '@/lib/local-library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function deleteDjProfile() {
    if (!user || confirmation !== 'DELETE DJ') return;
    setDeleting(true);
    try {
      const response = await fetch('/api/account/webe-dj', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${await user.getIdToken(true)}` },
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Deletion failed.');

      await deleteLocalLibrary(user.uid);
      const auth = getFirebaseAuth();
      if (auth) await signOut(auth);
      window.location.assign('/?djDataDeleted=true');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not delete We-be DJ data', description: error instanceof Error ? error.message : 'Try again.' });
      setDeleting(false);
    }
  }

  return <div className="mx-auto max-w-2xl space-y-6">
    <div><h1 className="text-3xl font-headline">Account & privacy</h1><p className="text-muted-foreground">Manage We-be DJ without giving up your shared We-be identity.</p></div>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Your We-be account stays yours</CardTitle><CardDescription>{user?.email}</CardDescription></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Your login can be used across We-be products. Removing We-be DJ does not delete that login or your profiles in other We-be apps.</p>
        <p>To request deletion of the entire We-be account and every connected product profile, use the central We-be account support process. This separate action must confirm the full scope before anything is erased.</p>
      </CardContent>
    </Card>
    <Card className="border-destructive/50">
      <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Delete We-be DJ data</CardTitle><CardDescription>This removes your DJ profile, purchase entitlement, playlists, and locally stored audio from this browser. It cannot be undone. Legally required payment and fraud-prevention records may be retained.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">Type <strong>DELETE DJ</strong> to confirm. Your main We-be account will remain active.</p>
        <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} aria-label="Type DELETE DJ to confirm" />
        <Button variant="destructive" disabled={confirmation !== 'DELETE DJ' || deleting} onClick={deleteDjProfile}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete only my We-be DJ data</Button>
      </CardContent>
    </Card>
    <p className="text-sm text-muted-foreground"><Link className="underline" href="/privacy">Privacy Policy</Link> · <Link className="underline" href="/terms">Terms of Sale and Use</Link></p>
  </div>;
}
