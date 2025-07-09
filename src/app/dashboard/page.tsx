'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  Headphones,
  Music,
  PlusCircle,
  ListMusic,
} from 'lucide-react';
import { tracks as dummyTracks } from '@/lib/dummy-tracks';
import type { Track } from '@/lib/dummy-tracks';

interface DeckState {
  track: Track | null;
  volume: number;
  isPlaying: boolean;
  isLive: boolean;
  progress: number;
  currentTime: number;
}

const initialDeckState: DeckState = {
  track: null,
  volume: 80,
  isPlaying: false,
  isLive: false,
  progress: 0,
  currentTime: 0,
};

const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
};

const PlayerDeck: FC<{
    deck: 'A' | 'B';
    state: DeckState;
    onPlay: () => void;
    onVolumeChange: (value: number[]) => void;
}> = ({ deck, state, onPlay, onVolumeChange }) => (
    <Card className="flex-1 bg-card/50 border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-headline flex justify-between items-center text-xl">
            Deck {deck}
            {state.isLive && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
        </CardTitle>
         <CardDescription className="truncate h-5 text-xs">
            {state.track ? `${state.track.title} - ${state.track.artist}` : 'Load a track'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-[150px_1fr] gap-4 items-center">
        <div className="relative aspect-square">
            <Image 
                src="https://placehold.co/150x150.png" 
                alt="Album Art" 
                width={150} 
                height={150} 
                className="rounded-full object-cover"
                data-ai-hint="vinyl record"
            />
        </div>
        <div className="space-y-4">
            <div className="w-full text-center">
                <p className="text-2xl font-bold font-code">{formatDuration(state.currentTime)}</p>
                <Slider
                    value={[state.progress]}
                    max={100}
                    step={1}
                    disabled={!state.track}
                    className="my-2"
                />
            </div>
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
        </div>
      </CardContent>
    </Card>
);

const TrackTable: FC<{
    tracks: Track[];
    onLoadA: (track: Track) => void;
    onLoadB: (track: Track) => void;
    onPreview: (track: Track) => void;
    onAddToPlaylist?: (track: Track) => void;
    isPlaylist?: boolean;
}> = ({ tracks, onLoadA, onLoadB, onPreview, onAddToPlaylist, isPlaylist = false }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Artist</TableHead>
                <TableHead className="hidden md:table-cell text-right">Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {tracks.map((track) => (
                <TableRow key={track.id}>
                    <TableCell className="font-medium">{track.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{track.artist}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-code">{formatDuration(track.duration)}</TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => onPreview(track)} title="Preview Track">
                            <Headphones className="h-4 w-4" />
                        </Button>
                        {!isPlaylist && onAddToPlaylist && (
                            <Button variant="ghost" size="icon" onClick={() => onAddToPlaylist(track)} title="Add to Playlist">
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onLoadA(track)}>A</Button>
                        <Button size="sm" variant="outline" onClick={() => onLoadB(track)}>B</Button>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);


export default function DashboardPage() {
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [crossfader, setCrossfader] = useState(0); // -100 for A, 100 for B

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  
  // Update audio volumes when faders or crossfader move
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    if (audioA) {
        const crossfaderEffect = (100 - Math.max(0, crossfader)) / 100;
        audioA.volume = (deckA.volume / 100) * crossfaderEffect;
        setDeckA(d => ({...d, isLive: d.isPlaying && audioA.volume > 0.01}));
    }
    
    if (audioB) {
        const crossfaderEffect = (100 - Math.max(0, -crossfader)) / 100;
        audioB.volume = (deckB.volume / 100) * crossfaderEffect;
        setDeckB(d => ({...d, isLive: d.isPlaying && audioB.volume > 0.01}));
    }
  }, [deckA.volume, deckB.volume, crossfader, deckA.isPlaying, deckB.isPlaying]);

  // Update track progress
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    const updateProgress = (audio: HTMLAudioElement, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
        if (!audio) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        setDeck(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audio.currentTime }));
    };
    
    const intervalA = setInterval(() => updateProgress(audioA!, setDeckA), 500);
    const intervalB = setInterval(() => updateProgress(audioB!, setDeckB), 500);
    
    return () => {
        clearInterval(intervalA);
        clearInterval(intervalB);
    };
  }, []);

  const loadTrack = (deck: 'A' | 'B', track: Track) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    
    setDeck(prev => {
        if (prev.isPlaying) audioRef.current?.pause();
        const newState = { ...initialDeckState, track: track, volume: prev.volume };
        if (audioRef.current) {
            audioRef.current.src = track.url;
        }
        return newState;
    });
  };

  const togglePlay = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const audioRef = deck === 'A' ? audioRefA : audioRefB;

    if (!state.track || !audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Error playing audio:", e));
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

  const handleAddToPlaylist = (track: Track) => {
    if (!playlist.find(t => t.id === track.id)) {
        setPlaylist(prev => [...prev, track]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full gap-4">
        {/* Top Section: Players and Mixer */}
        <div className="grid grid-cols-[1fr_minmax(200px,auto)_1fr] gap-4 items-center">
            <PlayerDeck deck="A" state={deckA} onPlay={() => togglePlay('A')} onVolumeChange={(v) => handleVolumeChange('A', v)} />

            <Card className="flex flex-col justify-center items-center p-4 h-full bg-card/50 border-0 shadow-none">
                <CardTitle className="font-headline text-center text-2xl mb-4">Mixer</CardTitle>
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
            </Card>
            
            <PlayerDeck deck="B" state={deckB} onPlay={() => togglePlay('B')} onVolumeChange={(v) => handleVolumeChange('B', v)} />
        </div>

        <Separator />

        {/* Bottom Section: Library and Playlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2 text-2xl"><Music /> Track Library</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                   <ScrollArea className="h-full">
                     <div className="p-6 pt-0">
                        <TrackTable 
                            tracks={dummyTracks}
                            onLoadA={loadTrack}
                            onLoadB={loadTrack}
                            onPreview={previewTrack}
                            onAddToPlaylist={handleAddToPlaylist}
                        />
                     </div>
                   </ScrollArea>
                </CardContent>
            </Card>
             <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2 text-2xl"><ListMusic /> Playlist</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                   <ScrollArea className="h-full">
                     <div className="p-6 pt-0">
                       {playlist.length > 0 ? (
                           <TrackTable 
                               tracks={playlist}
                               onLoadA={loadTrack}
                               onLoadB={loadTrack}
                               onPreview={previewTrack}
                               isPlaylist={true}
                           />
                       ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground">
                               <p>Add tracks from the library to build your playlist.</p>
                           </div>
                       )}
                     </div>
                   </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <audio ref={audioRefA} loop onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            const progress = (audio.currentTime / audio.duration) * 100;
            setDeckA(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audio.currentTime }));
        }} />
        <audio ref={audioRefB} loop onTimeUpdate={(e) => {
            const audio = e.currentTarget;
            const progress = (audio.currentTime / audio.duration) * 100;
            setDeckB(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audio.currentTime }));
        }} />
        <audio ref={previewAudioRef} />
    </div>
  );
}
