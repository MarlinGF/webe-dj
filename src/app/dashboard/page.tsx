'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  Headphones,
  Music,
} from 'lucide-react';
import { tracks as dummyTracks } from '@/lib/dummy-tracks';
import type { Track } from '@/lib/dummy-tracks';

interface DeckState {
  track: Track | null;
  volume: number;
  isPlaying: boolean;
  isLive: boolean;
}

const initialDeckState: DeckState = {
  track: null,
  volume: 80,
  isPlaying: false,
  isLive: false,
};

// You can move this to its own file in `components/dashboard/` later.
const PlayerDeck: FC<{
    deck: 'A' | 'B';
    state: DeckState;
    audioRef: React.RefObject<HTMLAudioElement>;
    onPlay: () => void;
    onVolumeChange: (value: number[]) => void;
}> = ({ deck, state, audioRef, onPlay, onVolumeChange }) => (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="font-headline flex justify-between items-center text-2xl">
            Deck {deck}
            {state.isLive && <Badge variant="destructive">LIVE</Badge>}
        </CardTitle>
        <CardDescription className="truncate h-5">
            {state.track ? `${state.track.title} - ${state.track.artist}` : 'Load a track'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="ghost" onClick={onPlay} disabled={!state.track} className="h-16 w-16 rounded-full">
                {state.isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
        </div>
        <div className="flex items-center gap-2">
            <Volume1 className="h-5 w-5 text-muted-foreground" />
            <Slider
              defaultValue={[state.volume]}
              max={100}
              step={1}
              onValueChange={onVolumeChange}
              disabled={!state.track}
            />
            <Volume2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <audio ref={audioRef} src={state.track?.url} loop />
      </CardContent>
    </Card>
);


export default function DashboardPage() {
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [crossfader, setCrossfader] = useState(0); // -100 for A, 100 for B

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  
  // This effect updates audio volumes when faders or the crossfader move.
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    if (audioA) {
        const crossfaderEffect = (100 - Math.max(0, crossfader)) / 100;
        const newVolume = (deckA.volume / 100) * crossfaderEffect;
        audioA.volume = newVolume;
        setDeckA(d => ({...d, isLive: d.isPlaying && newVolume > 0.01}));
    }
    
    if (audioB) {
        const crossfaderEffect = (100 - Math.max(0, -crossfader)) / 100;
        const newVolume = (deckB.volume / 100) * crossfaderEffect;
        audioB.volume = newVolume;
        setDeckB(d => ({...d, isLive: d.isPlaying && newVolume > 0.01}));
    }
  }, [deckA.volume, deckB.volume, crossfader, deckA.isPlaying, deckB.isPlaying]);


  const loadTrack = (deck: 'A' | 'B', track: Track) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    
    setDeck(prev => {
        if (prev.isPlaying) audioRef.current?.pause();
        return { ...initialDeckState, track: track, volume: prev.volume };
    });
  };

  const togglePlay = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const audioRef = deck === 'A' ? audioRefA : audioRefB;

    if (!state.track) return;

    if (state.isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
    }
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleVolumeChange = (deck: 'A' | 'B', value: number[]) => {
    const setState = deck === 'A' ? setDeckA : setDeckB;
    setState(prev => ({ ...prev, volume: value[0] }));
  };
  
  const previewTrack = (track: Track) => {
      const audio = previewAudioRef.current;
      if (audio) {
          audio.src = track.url;
          audio.volume = 0.5; // Preview volume
          audio.play();
      }
  }
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  return (
    <div className="container mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,_0.75fr)_1fr] gap-6">
            {/* Player A */}
            <PlayerDeck deck="A" state={deckA} audioRef={audioRefA} onPlay={() => togglePlay('A')} onVolumeChange={(v: number[]) => handleVolumeChange('A', v)} />

            {/* Mixer */}
            <div className="flex flex-col justify-center space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-center text-2xl">Mixer</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4 pt-4">
                        <Label>Crossfader</Label>
                        <div className="w-full flex items-center gap-4 text-sm font-bold">
                            <span className="text-primary">A</span>
                            <Slider
                                defaultValue={[crossfader]}
                                min={-100}
                                max={100}
                                step={1}
                                onValueChange={(v) => setCrossfader(v[0])}
                            />
                            <span className="text-primary">B</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Player B */}
            <PlayerDeck deck="B" state={deckB} audioRef={audioRefB} onPlay={() => togglePlay('B')} onVolumeChange={(v: number[]) => handleVolumeChange('B', v)} />
        </div>

        <Separator />

        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-2xl"><Music /> Track Library</CardTitle>
                <CardDescription>Load tracks onto the decks to start mixing. NOTE: These are dummy tracks. You'll need to add your own audio files to the `/public/audio` folder and update `src/lib/dummy-tracks.ts`.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead className="hidden sm:table-cell">Artist</TableHead>
                                <TableHead className="hidden md:table-cell">Duration</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dummyTracks.map((track) => (
                                <TableRow key={track.id}>
                                    <TableCell className="font-medium">{track.title}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{track.artist}</TableCell>
                                    <TableCell className="hidden md:table-cell">{formatDuration(track.duration)}</TableCell>
                                    <TableCell className="text-right space-x-1 sm:space-x-2">
                                        <Button variant="outline" size="icon" onClick={() => previewTrack(track)} title="Preview Track">
                                            <Headphones className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" onClick={() => loadTrack('A', track)}>Load A</Button>
                                        <Button size="sm" onClick={() => loadTrack('B', track)}>Load B</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        <audio ref={previewAudioRef} />
    </div>
  );
}
