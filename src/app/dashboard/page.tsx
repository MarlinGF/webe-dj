import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Library, ListMusic, Radio, Volume2 } from 'lucide-react';

const capabilities = [
  { title: 'Build your library', description: 'Upload songs and organize commercial spots by client.', icon: Library },
  { title: 'Prepare playlists', description: 'Create reusable running orders and load tracks into either deck.', icon: ListMusic },
  { title: 'Mix live', description: 'Preview, cue, seek, adjust levels, and crossfade between two decks.', icon: Volume2 },
  { title: 'Run continuously', description: 'Enable continuous play and choose the transition speed for hands-off programming.', icon: Radio },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">Studio overview</Badge>
        <h1 className="text-4xl font-headline">Your broadcast workflow</h1>
        <p className="max-w-2xl text-muted-foreground">Use Controls to manage audio, assemble a playlist, and run your show from one focused workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {capabilities.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
