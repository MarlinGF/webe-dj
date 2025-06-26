'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Copy, Share2, Check } from 'lucide-react';

export function ShareStream() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [streamUrl, setStreamUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      setStreamUrl(`${window.location.origin}/stream/${user.uid}`);
    }
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    toast({
      title: 'Link Copied!',
      description: 'Your stream link is now on your clipboard.',
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-2xl">
            <Share2 className="h-6 w-6" /> Share Your Stream
        </CardTitle>
        <CardDescription>
          Share this link with your audience on social media.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="stream-url">Your Unique Stream URL</Label>
          <div className="flex items-center gap-2">
            <Input id="stream-url" value={streamUrl} readOnly />
            <Button variant="outline" size="icon" onClick={handleCopy} disabled={!streamUrl}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
