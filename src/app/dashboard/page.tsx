'use client';
import { useAuth } from '@/hooks/use-auth';
import { StreamConfig } from '@/components/dashboard/stream-config';
import { ShareStream } from '@/components/dashboard/share-stream';
import { AudioPreview } from '@/components/dashboard/audio-preview';
import { ChatCommandGenerator } from '@/components/dashboard/chat-command-generator';
import { VideoPreview } from '@/components/dashboard/video-preview';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto">
        <div className="mb-8">
            <h2 className="font-headline text-4xl font-bold tracking-tight text-primary">
                Welcome, {user?.email?.split('@')[0] || 'Streamer'}!
            </h2>
            <p className="text-muted-foreground">
                Here's your control center. Manage your stream and engage with your audience.
            </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <VideoPreview />
                <ChatCommandGenerator />
            </div>
            <div className="lg:col-span-1 space-y-6">
                <AudioPreview />
                <StreamConfig />
                <ShareStream />
            </div>
        </div>
    </div>
  );
}
