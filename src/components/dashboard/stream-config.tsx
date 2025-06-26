'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, KeyRound, Server, Check } from 'lucide-react';

export function StreamConfig() {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // In a real app, these values would come from a backend service integrated with Mux
  const streamKey = process.env.NEXT_PUBLIC_MUX_STREAM_KEY || 'sk_live_...';
  const rtmpUrl = process.env.NEXT_PUBLIC_MUX_RTMP_URL || 'rtmps://global-live.mux.com:443/app';

  const handleCopy = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard!',
      description: `${type === 'key' ? 'Stream key' : 'Server URL'} has been copied.`,
    });
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-2xl">
            <KeyRound className="h-6 w-6" /> Stream Setup
        </CardTitle>
        <CardDescription>
          Use these details in your streaming software like OBS or Streamlabs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="rtmp-url">RTMP Server URL</Label>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <Input id="rtmp-url" value={rtmpUrl} readOnly className="font-code" />
            <Button variant="outline" size="icon" onClick={() => handleCopy(rtmpUrl, 'url')}>
              {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stream-key">Stream Key</Label>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            <Input id="stream-key" type="password" value={streamKey} readOnly className="font-code" />
            <Button variant="outline" size="icon" onClick={() => handleCopy(streamKey, 'key')}>
              {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
