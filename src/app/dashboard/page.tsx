
'use client';

import { useState, useRef, useEffect, type FC, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  Rewind,
  FastForward,
  Square,
  Upload,
  Loader2,
  MapPin,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url: string; 
}

interface DeckState {
  track: Track | null;
  volume: number;
  isPlaying: boolean;
  isLive: boolean;
  progress: number;
  currentTime: number;
  startTime: number;
}

const initialDeckState: DeckState = {
  track: null,
  volume: 80,
  isPlaying: false,
  isLive: false,
  progress: 0,
  currentTime: 0,
  startTime: 0,
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
    onStop: () => void;
    onSeek: (amount: number) => void;
    onVolumeChange: (value: number[]) => void;
    onProgressChange: (value: number[]) => void;
    onSetCue: () => void;
}> = ({ deck, state, onPlay, onStop, onSeek, onVolumeChange, onProgressChange, onSetCue }) => (
    <Card className="flex-1 bg-card/50 border-0 shadow-none">
        <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
                <CardTitle className="font-headline text-lg">
                    Deck {deck}
                </CardTitle>
                {state.isLive && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
            </div>

            <div className="space-y-1 h-12">
                <p className="font-bold text-xl truncate" title={state.track?.title ?? ''}>{state.track?.title ?? 'No Track Loaded'}</p>
                <p className="text-xs text-muted-foreground truncate">{state.track?.artist ?? '---'}</p>
            </div>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-code">{formatDuration(state.currentTime)}</p>
                    <Slider
                        value={[state.progress]}
                        max={100}
                        step={0.1}
                        disabled={!state.track}
                        onValueChange={onProgressChange}
                    />
                    <p className="text-xs font-code">{formatDuration(state.track?.duration ?? 0)}</p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                         <Button size="icon" variant="ghost" onClick={() => onSeek(-5)} disabled={!state.track} className="h-8 w-8">
                            <Rewind className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={onPlay} disabled={!state.track} className="h-8 w-8">
                            {state.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                         <Button size="icon" variant="ghost" onClick={onStop} disabled={!state.track} className="h-8 w-8">
                            <Square className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onSeek(5)} disabled={!state.track} className="h-8 w-8">
                            <FastForward className="h-5 w-5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={onSetCue} disabled={!state.track} className="h-8 w-8" title="Set Cue Point">
                            <MapPin className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 w-1/3">
                        <Volume1 className="h-5 w-5 text-muted-foreground" />
                        <Slider
                          value={[state.volume]}
                          max={100}
                          step={1}
                          onValueChange={onVolumeChange}
                          disabled={!state.track}
                        />
                        <Volume2 className="h-5 w-5 text-muted-foreground" />
                    </div>
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
                <TableHead className="py-0 px-4 text-xs h-auto">Title</TableHead>
                <TableHead className="hidden sm:table-cell py-0 px-4 text-xs h-auto">Artist</TableHead>
                <TableHead className="hidden md:table-cell text-right py-0 px-4 text-xs h-auto">Time</TableHead>
                <TableHead className="text-right py-0 px-4 text-xs h-auto">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {tracks.map((track) => (
                <TableRow key={track.id} className="h-auto">
                    <TableCell className="font-medium py-0 px-4 text-xs">{track.title}</TableCell>
                    <TableCell className="hidden sm:table-cell py-0 px-4 text-xs">{track.artist}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-code py-0 px-4 text-xs">{formatDuration(track.duration)}</TableCell>
                    <TableCell className="text-right space-x-1 py-0 px-4">
                        <Button variant="ghost" size="icon" onClick={() => onPreview(track)} title="Preview Track" className="h-6 w-6">
                            <Headphones className="h-3 w-3" />
                        </Button>
                        {!isPlaylist && onAddToPlaylist && (
                            <Button variant="ghost" size="icon" onClick={() => onAddToPlaylist(track)} title="Add to Playlist" className="h-6 w-6">
                                <PlusCircle className="h-3 w-3" />
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onLoadA(track)} className="h-6 px-2 text-xs">A</Button>
                        <Button size="sm" variant="outline" onClick={() => onLoadB(track)} className="h-6 px-2 text-xs">B</Button>
                    </TableCell>
                </TableRow>
            ))}
        </TableBody>
    </Table>
);


export default function DashboardPage() {
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [crossfader, setCrossfader] = useState(-100); // -100 for A, 100 for B
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fadeSpeed, setFadeSpeed] = useState(5); // seconds
  const [isFading, setIsFading] = useState(false);
  const [isAutoFadeEnabled, setIsAutoFadeEnabled] = useState(false);

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
        if (!audio || !audio.duration) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        setDeck(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audio.currentTime }));
    };
    
    const intervalA = setInterval(() => { if (deckA.isPlaying) updateProgress(audioA!, setDeckA) }, 250);
    const intervalB = setInterval(() => { if (deckB.isPlaying) updateProgress(audioB!, setDeckB) }, 250);
    
    return () => {
        clearInterval(intervalA);
        clearInterval(intervalB);
    };
  }, [deckA.isPlaying, deckB.isPlaying]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const newTracks: Track[] = [];

    for (const file of Array.from(files)) {
      try {
        const url = URL.createObjectURL(file);

        const duration = await new Promise<number>((resolve, reject) => {
          const audio = document.createElement('audio');
          audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
          });
          audio.addEventListener('error', (e) => reject(`Error loading audio duration for ${file.name}`));
          audio.src = url;
        });

        const newTrack: Track = {
          id: `${Date.now()}-${file.name}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          duration: duration,
          url: url,
        };

        newTracks.push(newTrack);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }

    setLibraryTracks(prev => [...prev, ...newTracks].sort((a,b) => a.title.localeCompare(b.title)));
    setIsProcessing(false);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const loadTrack = (deck: 'A' | 'B', track: Track) => {
    const setDeck = deck === 'A' ? setDeckA : setDeckB;
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    
    setDeck(prev => {
        if (prev.isPlaying) audioRef.current?.pause();
        const newState = { ...initialDeckState, track: track, volume: prev.volume, startTime: 0 };
        if (audioRef.current) {
            audioRef.current.src = track.url;
            audioRef.current.load();
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

  const handleStop = (deck: 'A' | 'B') => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const state = deck === 'A' ? deckA : deckB;
    if (audioRef.current && state.track) {
        audioRef.current.pause();
        audioRef.current.currentTime = state.startTime;
        setState(d => ({ ...d, isPlaying: false, currentTime: state.startTime, progress: (state.startTime / (state.track!.duration || 1)) * 100 }));
    }
  };

  const handleSeek = (deck: 'A' | 'B', amount: number) => {
      const audioRef = deck === 'A' ? audioRefA : audioRefB;
      if (audioRef.current && audioRef.current.duration) {
          const newTime = audioRef.current.currentTime + amount;
          audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, newTime));
      }
  };
  
  const handleProgressChange = (deck: 'A' | 'B', value: number[]) => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    if (audioRef.current && audioRef.current.duration) {
        const newTime = (audioRef.current.duration * value[0]) / 100;
        audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (deck: 'A' | 'B', value: number[]) => {
    const setState = deck === 'A' ? setDeckA : setDeckB;
    setState(prev => ({ ...prev, volume: value[0] }));
  };

  const handleCrossfaderChange = (value: number[]) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
      setIsFading(false);
    }
    setCrossfader(value[0]);
  };

  const handleAutoFade = () => {
    if (isFading) return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    
    setIsFading(true);
    const startValue = crossfader;
    const endValue = startValue <= 0 ? 100 : -100;
    
    if (endValue > 0 && !deckB.isPlaying) { // Fading to B
      togglePlay('B');
    } else if (endValue < 0 && !deckA.isPlaying) { // Fading to A
      togglePlay('A');
    }
    
    const duration = fadeSpeed * 1000;
    const intervalTime = 25;
    const totalSteps = duration / intervalTime;
    const stepValue = (endValue - startValue) / totalSteps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const nextValue = startValue + (stepValue * currentStep);
      
      if ((stepValue > 0 && nextValue >= endValue) || (stepValue < 0 && nextValue <= endValue)) {
        setCrossfader(endValue);
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
        setIsFading(false);
      } else {
        setCrossfader(nextValue);
      }
    }, intervalTime);
  };
  
  const handleTrackEnd = (deck: 'A' | 'B') => {
    const setState = deck === 'A' ? setDeckA : setDeckB;
    setState(d => ({ ...d, isPlaying: false, progress: 100 }));

    const currentTrack = (deck === 'A' ? deckA : deckB).track;
    
    if (playlist.length > 0 && currentTrack) {
        const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
        if (currentIndex > -1) {
            const nextIndex = (currentIndex + 1) % playlist.length;
            const nextTrack = playlist[nextIndex];
            loadTrack(deck, nextTrack);
        }
    }
    
    if (isAutoFadeEnabled) {
      handleAutoFade();
    }
  };

  const handleSetCue = (deck: 'A' | 'B') => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    if (audioRef.current) {
        setState(d => ({ ...d, startTime: audioRef.current.currentTime }));
    }
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
            <PlayerDeck 
                deck="A"
                state={deckA}
                onPlay={() => togglePlay('A')}
                onStop={() => handleStop('A')}
                onSeek={(amount) => handleSeek('A', amount)}
                onVolumeChange={(v) => handleVolumeChange('A', v)}
                onProgressChange={(v) => handleProgressChange('A', v)}
                onSetCue={() => handleSetCue('A')}
            />

            <Card className="flex flex-col justify-center items-center p-4 h-full bg-card/50 border-0 shadow-none">
                <CardTitle className="font-headline text-center text-xl mb-2">Mixer</CardTitle>
                 <div className="w-full flex items-center gap-4 text-sm font-bold">
                    <span className="text-primary">A</span>
                    <Slider
                        value={[crossfader]}
                        min={-100}
                        max={100}
                        step={1}
                        onValueChange={handleCrossfaderChange}
                    />
                    <span className="text-primary">B</span>
                </div>
                <div className="mt-4 w-full space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="autofade-switch" className="text-sm">Auto Fade</Label>
                        <Switch
                            id="autofade-switch"
                            checked={isAutoFadeEnabled}
                            onCheckedChange={setIsAutoFadeEnabled}
                            disabled={isFading}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fadespeed-slider" className="text-xs text-muted-foreground w-16">Fade Speed</Label>
                        <Slider
                            id="fadespeed-slider"
                            value={[fadeSpeed]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={(v) => setFadeSpeed(v[0])}
                            disabled={isFading}
                        />
                        <span className="text-xs font-code w-10 text-right">{fadeSpeed}s</span>
                    </div>
                    <Button onClick={handleAutoFade} disabled={isFading} className="w-full">
                        {isFading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Manual Fade
                    </Button>
                </div>
            </Card>
            
            <PlayerDeck 
                deck="B"
                state={deckB}
                onPlay={() => togglePlay('B')}
                onStop={() => handleStop('B')}
                onSeek={(amount) => handleSeek('B', amount)}
                onVolumeChange={(v) => handleVolumeChange('B', v)}
                onProgressChange={(v) => handleProgressChange('B', v)}
                onSetCue={() => handleSetCue('B')}
            />
        </div>

        <Separator />

        {/* Bottom Section: Library and Playlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <Card 
                className={`flex flex-col relative transition-colors duration-200 ${isDragging ? 'border-primary bg-primary/10' : ''}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 rounded-lg pointer-events-none">
                      <Upload className="h-10 w-10 text-primary animate-bounce" />
                      <p className="mt-2 text-lg font-semibold text-primary">Drop files to upload</p>
                  </div>
                )}
                <CardHeader className="p-4 flex-row items-center justify-between">
                    <CardTitle className="font-headline flex items-center gap-2 text-xl"><Music className="h-5 w-5"/> Track Library</CardTitle>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="audio/*"
                        multiple
                        style={{ display: 'none' }}
                    />
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Add Tracks
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                   <ScrollArea className="h-full">
                     <div className="p-2 pt-0">
                        {libraryTracks.length > 0 ? (
                            <TrackTable 
                                tracks={libraryTracks}
                                onLoadA={(track) => loadTrack('A', track)}
                                onLoadB={(track) => loadTrack('B', track)}
                                onPreview={previewTrack}
                                onAddToPlaylist={handleAddToPlaylist}
                            />
                        ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                               <p>Your library is empty. Click "Add Tracks" or drag and drop files here.</p>
                           </div>
                        )}
                     </div>
                   </ScrollArea>
                </CardContent>
            </Card>
             <Card className="flex flex-col">
                <CardHeader className="p-4">
                    <CardTitle className="font-headline flex items-center gap-2 text-xl"><ListMusic className="h-5 w-5"/> Playlist</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                   <ScrollArea className="h-full">
                     <div className="p-2 pt-0">
                       {playlist.length > 0 ? (
                           <TrackTable 
                               tracks={playlist}
                               onLoadA={(track) => loadTrack('A', track)}
                               onLoadB={(track) => loadTrack('B', track)}
                               onPreview={previewTrack}
                               isPlaylist={true}
                           />
                       ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                               <p>Add tracks from the library to build your playlist.</p>
                           </div>
                       )}
                     </div>
                   </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <audio ref={audioRefA} onEnded={() => handleTrackEnd('A')} onLoadedMetadata={() => audioRefA.current && (audioRefA.current.currentTime = deckA.startTime)} />
        <audio ref={audioRefB} onEnded={() => handleTrackEnd('B')} onLoadedMetadata={() => audioRefB.current && (audioRefB.current.currentTime = deckB.startTime)} />
        <audio ref={previewAudioRef} />
    </div>
  );
}
