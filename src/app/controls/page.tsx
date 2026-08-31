
'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { webeDjProfilePath } from '@/lib/product-profile';
import {
  createLocalId,
  deleteLocalTrack,
  listLocalPlaylists,
  listLocalTracks,
  putLocalPlaylist,
  putLocalTrack,
  requestPersistentLocalStorage,
  type LocalTrackRecord,
} from '@/lib/local-library';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Trash2,
  X,
  MapPin,
  Music2,
  CreditCard,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { VolumeMeter } from '@/components/VolumeMeter';
import { AddCommercialDialog } from '@/components/AddCommercialDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string; 
  createdAt?: number;
  type: 'song' | 'commercial';
  client?: string;
  source?: 'upload' | 'itunes';
  musicLibraryPersistentId?: string;
}

export interface Playlist {
    id: string;
    name: string;
    items: Track[];
}

interface DeckState {
  track: Track | null;
  volume: number;
  isPlaying: boolean;
  isLive: boolean;
  progress: number;
  currentTime: number;
  startTime: number;
  analyser: AnalyserNode | null;
}

interface ImportedMusicLibraryTrack {
  title: string;
  artist?: string;
  duration?: number;
  url: string;
  musicLibraryPersistentId?: string;
}

interface MusicLibraryImportPayload {
  tracks?: ImportedMusicLibraryTrack[];
  error?: string;
  cancelled?: boolean;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        webeDjMusicLibrary?: {
          postMessage: (message: { action: 'chooseSongs' | 'importPlayableLibrary' }) => void;
        };
      };
    };
    webeDjMusicLibraryImportComplete?: (payload: MusicLibraryImportPayload) => void;
  }
}

const initialDeckState: DeckState = {
  track: null,
  volume: 80,
  isPlaying: false,
  isLive: false,
  progress: 0,
  currentTime: 0,
  startTime: 0,
  analyser: null,
};

const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
};

const FREE_SONG_LIMIT = 4;

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
                <CardTitle className="font-headline text-lg text-primary">
                    Deck {deck}
                </CardTitle>
                <div className="flex items-center gap-2 w-1/2">
                    <Volume1 className="h-5 w-5 text-muted-foreground" />
                    <Slider
                        value={[state.volume]}
                        max={100}
                        step={1}
                        onValueChange={onVolumeChange}
                        disabled={!state.track}
                    />
                    <Volume2 className="h-5 w-5 text-muted-foreground" />
                    <VolumeMeter analyser={state.analyser} isPlaying={state.isPlaying} />
                </div>
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

                <div className="flex items-center justify-start">
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
    onRemoveFromPlaylist?: (trackId: string) => void;
    onDeleteFromLibrary: (track: Track) => void;
    isPlaylist?: boolean;
}> = ({ tracks, onLoadA, onLoadB, onPreview, onAddToPlaylist, onRemoveFromPlaylist, onDeleteFromLibrary, isPlaylist = false }) => (
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="py-0 px-4 text-xs h-auto">Title</TableHead>
                <TableHead className="hidden sm:table-cell py-0 px-4 text-xs h-auto">{isPlaylist ? 'Type' : 'Artist'}</TableHead>
                <TableHead className="hidden md:table-cell text-right py-0 px-4 text-xs h-auto">Time</TableHead>
                <TableHead className="text-right py-0 px-4 text-xs h-auto">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {tracks.map((track) => (
                <TableRow key={track.id} className="h-auto">
                    <TableCell className="font-medium py-0 px-4 text-xs">{track.title}</TableCell>
                    <TableCell className="hidden sm:table-cell py-0 px-4 text-xs capitalize">{isPlaylist ? track.type : track.artist}</TableCell>
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
                        {isPlaylist && onRemoveFromPlaylist && (
                           <Button variant="ghost" size="icon" onClick={() => onRemoveFromPlaylist(track.id)} title="Remove from Playlist" className="h-6 w-6">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                         {!isPlaylist && onDeleteFromLibrary && (
                           <Button variant="ghost" size="icon" onClick={() => onDeleteFromLibrary(track)} title="Delete from Library" className="h-6 w-6 text-destructive/70 hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
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

export default function ControlsPage() {
  const [deckA, setDeckA] = useState<DeckState>(initialDeckState);
  const [deckB, setDeckB] = useState<DeckState>(initialDeckState);
  
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [commercials, setCommercials] = useState<Track[]>([]);
  const [groupedCommercials, setGroupedCommercials] = useState<Record<string, Track[]>>({});

  const [playlists, setPlaylists] = useState<{ id: string, name: string }[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // UI/Control State
  const [crossfader, setCrossfader] = useState(-100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMusicLibraryImporting, setIsMusicLibraryImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fadeSpeed, setFadeSpeed] = useState(2);
  const [isAutoFadeEnabled, setIsAutoFadeEnabled] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isNewPlaylistDialogOpen, setIsNewPlaylistDialogOpen] = useState(false);
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainRefA = useRef<GainNode | null>(null);
  const gainRefB = useRef<GainNode | null>(null);
  const sourceRefA = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceRefB = useRef<MediaElementAudioSourceNode | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const getMusicLibraryBridge = () => {
    if (typeof window === 'undefined') return null;
    return window.webkit?.messageHandlers?.webeDjMusicLibrary ?? null;
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;

        if (audioRefA.current && !sourceRefA.current) {
          sourceRefA.current = context.createMediaElementSource(audioRefA.current);
          gainRefA.current = context.createGain();
          const analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          sourceRefA.current.connect(gainRefA.current).connect(analyser).connect(context.destination);
          setDeckA(d => ({ ...d, analyser }));
        }

        if (audioRefB.current && !sourceRefB.current) {
          sourceRefB.current = context.createMediaElementSource(audioRefB.current);
          gainRefB.current = context.createGain();
          const analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          sourceRefB.current.connect(gainRefB.current).connect(analyser).connect(context.destination);
          setDeckB(d => ({ ...d, analyser }));
        }
      } catch (e) {
        console.error("Error initializing AudioContext:", e);
      }
    }
  }, []);

  const hydrateTrack = (record: LocalTrackRecord): Track => ({
    ...record,
    url: record.audioBlob ? URL.createObjectURL(record.audioBlob) : record.localUrl ?? '',
  });

  const refreshLocalLibrary = async () => {
    if (!user) return [];
    const records = await listLocalTracks(user.uid);
    const hydratedTracks = records.map(hydrateTrack);
    setLibraryTracks((current) => {
      current.forEach((track) => track.url.startsWith('blob:') && URL.revokeObjectURL(track.url));
      return hydratedTracks.filter((track) => track.type === 'song');
    });
    setCommercials((current) => {
      current.forEach((track) => track.url.startsWith('blob:') && URL.revokeObjectURL(track.url));
      return hydratedTracks.filter((track) => track.type === 'commercial');
    });
    return hydratedTracks;
  };

  const refreshPlaylists = async (availableTracks?: Track[]) => {
    if (!user) return;
    const localPlaylists = await listLocalPlaylists(user.uid);
    setPlaylists(localPlaylists.map(({ id, name }) => ({ id, name })));
    const selectedId = activePlaylist?.id ?? localPlaylists[0]?.id;
    if (selectedId) {
      const selected = localPlaylists.find((playlist) => playlist.id === selectedId);
      const allTracks = availableTracks ?? [...libraryTracks, ...commercials];
      if (selected) {
        setActivePlaylist({
          id: selected.id,
          name: selected.name,
          items: selected.items.map((item) => allTracks.find((track) => track.id === item.id && track.type === item.type)).filter(Boolean) as Track[],
        });
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    void (async () => {
      await requestPersistentLocalStorage();
      const tracks = await refreshLocalLibrary();
      await refreshPlaylists(tracks);
    })();
    Promise.all([
      getDoc(doc(db, webeDjProfilePath(user.uid))),
      getDoc(doc(db, 'users', user.uid)),
    ]).then(([profile, legacy]) => {
      setHasLifetimeAccess(profile.data()?.lifetimeAccess === true || legacy.data()?.lifetimeAccess === true);
    }).catch(() => setHasLifetimeAccess(false));
  }, [user]);

  useEffect(() => {
    const groups = commercials.reduce((acc, comm) => {
        const client = comm.client || 'Unknown Client';
        if (!acc[client]) acc[client] = [];
        acc[client].push(comm);
        return acc;
    }, {} as Record<string, Track[]>);
    setGroupedCommercials(groups);
  }, [commercials]);

  const handlePlaylistChange = async (playlistId: string) => {
    if (!user || !playlistId) return;
    const playlistData = (await listLocalPlaylists(user.uid)).find((playlist) => playlist.id === playlistId);
    if (!playlistData) return;
    const allTracks = [...libraryTracks, ...commercials];
    const resolvedItems = playlistData.items.map((item) => allTracks.find((track) => track.id === item.id && track.type === item.type)).filter(Boolean) as Track[];
    
    setActivePlaylist({
        id: playlistId,
        name: playlistData.name,
        items: resolvedItems,
    });
  };

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;
    try {
        const newPlaylistId = createLocalId();
        await putLocalPlaylist(user.uid, { id: newPlaylistId, ownerId: user.uid, name: newPlaylistName.trim(), items: [], createdAt: Date.now() });
        setNewPlaylistName('');
        setIsNewPlaylistDialogOpen(false);
        await refreshPlaylists();
        await handlePlaylistChange(newPlaylistId);
    } catch (error) {
        console.error("Error creating playlist:", error);
    }
  };

  useEffect(() => {
      const gainNodeA = gainRefA.current;
      const gainNodeB = gainRefB.current;
      if (gainNodeA && gainNodeB) {
          const crossfaderValueA = Math.cos(((crossfader + 100) / 200) * 0.5 * Math.PI);
          const crossfaderValueB = Math.cos((1.0 - ((crossfader + 100) / 200)) * 0.5 * Math.PI);
          gainNodeA.gain.value = (deckA.volume / 100) * crossfaderValueA;
          gainNodeB.gain.value = (deckB.volume / 100) * crossfaderValueB;
          setDeckA(d => ({...d, isLive: d.isPlaying && gainNodeA.gain.value > 0.01}));
          setDeckB(d => ({...d, isLive: d.isPlaying && gainNodeB.gain.value > 0.01}));
      }
  }, [deckA.volume, deckB.volume, crossfader, deckA.isPlaying, deckB.isPlaying]);

  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;
    const intervalA = setInterval(() => { 
        if (deckA.isPlaying && audioA) {
            const progress = (audioA.currentTime / (audioA.duration || 1)) * 100;
            setDeckA(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audioA.currentTime }));
        }
    }, 250);
    const intervalB = setInterval(() => { 
        if (deckB.isPlaying && audioB) {
            const progress = (audioB.currentTime / (audioB.duration || 1)) * 100;
            setDeckB(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audioB.currentTime }));
        }
    }, 250);
    return () => { clearInterval(intervalA); clearInterval(intervalB); };
  }, [deckA.isPlaying, deckB.isPlaying]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const remainingFreeSlots = Math.max(0, FREE_SONG_LIMIT - libraryTracks.length);
    if (!hasLifetimeAccess && files.length > remainingFreeSlots) {
      toast({
        variant: 'destructive',
        title: 'Free library limit reached',
        description: `The free plan holds ${FREE_SONG_LIMIT} songs on this device. Lifetime access is $9.99.`,
      });
      return;
    }
    setIsProcessing(true);
    try {
      await Promise.all(Array.from(files).map(async (file, index) => {
        const duration = await new Promise<number>((resolve) => {
          const localUrl = URL.createObjectURL(file);
          const audio = new Audio(localUrl);
          audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
          audio.onerror = () => resolve(0);
          audio.onloadeddata = () => URL.revokeObjectURL(localUrl);
        });
        await putLocalTrack(user.uid, {
          id: createLocalId(),
          ownerId: user.uid,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          duration,
          type: 'song',
          source: 'upload',
          audioBlob: file,
          createdAt: Date.now() + index,
        });
      }));
      const tracks = await refreshLocalLibrary();
      await refreshPlaylists(tracks);
      toast({ title: 'Songs added', description: `${files.length} ${files.length === 1 ? 'track is' : 'tracks are'} ready in your library.` });
    } catch (error) {
      console.error('Error uploading songs:', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: 'One or more songs could not be added. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const savePlaylistItems = async (items: Track[]) => {
    if (!user || !activePlaylist) return;
    await putLocalPlaylist(user.uid, {
      id: activePlaylist.id,
      ownerId: user.uid,
      name: activePlaylist.name,
      items: items.map(({ id, type }) => ({ id, type })),
      createdAt: Date.now(),
    });
    setActivePlaylist({ ...activePlaylist, items });
  };

  const handleAddToPlaylist = async (track: Track) => {
    if (!activePlaylist) {
      toast({ title: 'Choose a playlist first', description: 'Create or select a playlist, then add the track.' });
      return;
    }
    if (activePlaylist.items.some((item) => item.id === track.id && item.type === track.type)) {
      toast({ title: 'Already in playlist', description: `${track.title} is already included.` });
      return;
    }
    try {
      await savePlaylistItems([...activePlaylist.items, track]);
      toast({ title: 'Added to playlist', description: `${track.title} was added to ${activePlaylist.name}.` });
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      toast({ variant: 'destructive', title: 'Could not update playlist' });
    }
  };

  const handleRemoveFromPlaylist = async (trackId: string) => {
    if (!activePlaylist) return;
    try {
      await savePlaylistItems(activePlaylist.items.filter((track) => track.id !== trackId));
    } catch (error) {
      console.error('Error removing track from playlist:', error);
      toast({ variant: 'destructive', title: 'Could not update playlist' });
    }
  };

  useEffect(() => {
    window.webeDjMusicLibraryImportComplete = async (payload: MusicLibraryImportPayload) => {
      if (!user) return;

      setIsMusicLibraryImporting(false);

      if (payload.cancelled) {
        toast({ title: 'iTunes import cancelled' });
        return;
      }

      if (payload.error) {
        toast({ variant: 'destructive', title: 'iTunes Import Failed', description: payload.error });
        return;
      }

      const tracks = payload.tracks ?? [];

      if (tracks.length === 0) {
        toast({ title: 'No iTunes Songs Added', description: 'No playable songs were selected.' });
        return;
      }

      if (!hasLifetimeAccess && libraryTracks.length + tracks.length > FREE_SONG_LIMIT) {
        toast({
          variant: 'destructive',
          title: 'Free library limit reached',
          description: `Choose up to ${Math.max(0, FREE_SONG_LIMIT - libraryTracks.length)} more songs, or unlock unlimited songs for $9.99.`,
        });
        return;
      }

      await Promise.all(
        tracks.map((track) =>
          putLocalTrack(user.uid, {
            id: createLocalId(),
            ownerId: user.uid,
            title: track.title || 'Untitled Song',
            artist: track.artist || 'Unknown Artist',
            duration: track.duration || 0,
            type: 'song',
            source: 'itunes',
            localUrl: track.url,
            musicLibraryPersistentId: track.musicLibraryPersistentId,
            createdAt: Date.now(),
          })
        )
      );
      const localTracks = await refreshLocalLibrary();
      await refreshPlaylists(localTracks);

      toast({
        title: 'iTunes Songs Added',
        description: `${tracks.length} ${tracks.length === 1 ? 'song was' : 'songs were'} added to your DJ library.`,
      });
    };

    return () => {
      if (window.webeDjMusicLibraryImportComplete) {
        delete window.webeDjMusicLibraryImportComplete;
      }
    };
  }, [hasLifetimeAccess, libraryTracks.length, toast, user]);

  const handleAddCommercial = async (commercial: Omit<LocalTrackRecord, 'id' | 'ownerId' | 'createdAt'>) => {
    if (!user) return;
    await putLocalTrack(user.uid, {
      ...commercial,
      id: createLocalId(),
      ownerId: user.uid,
      createdAt: Date.now(),
    });
    const tracks = await refreshLocalLibrary();
    await refreshPlaylists(tracks);
  };

  const handleLifetimePurchase = async () => {
    if (!user) return;
    setIsStartingCheckout(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json() as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout could not be started.');
      window.location.assign(result.url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Checkout unavailable',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
      });
      setIsStartingCheckout(false);
    }
  };

  const handleMusicLibraryImport = (action: 'chooseSongs' | 'importPlayableLibrary') => {
    const bridge = getMusicLibraryBridge();

    if (!bridge) {
      toast({
        title: 'iTunes Import Needs the iOS App',
        description: 'This browser cannot read your iTunes library. Use Add Songs here, or open Webe-DJ in the iOS app.',
      });
      return;
    }

    setIsMusicLibraryImporting(true);
    bridge.postMessage({ action });
  };

  const loadTrack = (deck: 'A' | 'B', track: Track) => {
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) {
        audio.pause();
        audio.src = track.url;
        audio.load();
    }
    setState(prev => ({ ...initialDeckState, track, volume: prev.volume, analyser: prev.analyser }));
  };
  
  const togglePlay = (deck: 'A' | 'B') => {
    if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    const state = deck === 'A' ? deckA : deckB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    if (!audio || !state.track) return;
    if (state.isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleStop = (deck: 'A' | 'B') => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    const state = deck === 'A' ? deckA : deckB;
    if (audio && state.track) {
        audio.pause();
        audio.currentTime = state.startTime;
        setState(d => ({ ...d, isPlaying: false, currentTime: state.startTime, progress: (state.startTime / (state.track!.duration || 1)) * 100 }));
    }
  };

  const handleSeek = (deck: 'A' | 'B', amount: number) => {
      const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
      if (audio?.duration) audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + amount));
  };
  
  const handleProgressChange = (deck: 'A' | 'B', value: number[]) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const state = deck === 'A' ? deckA : deckB;
    const setState = deck === 'A' ? setDeckA : setDeckB;
    if (audio && state.track) {
        const newTime = (state.track.duration * value[0]) / 100;
        audio.currentTime = newTime;
        setState(d => ({...d, progress: value[0], currentTime: newTime}));
    }
  };

  const findNextTrack = (finishedTrackId: string, otherDeckTrackId?: string) => {
    if (!activePlaylist || activePlaylist.items.length < 2) return null;
    const finishedTrackIndex = activePlaylist.items.findIndex(t => t.id === finishedTrackId);
    for (let i = 1; i < activePlaylist.items.length; i++) {
      const nextIndex = (finishedTrackIndex + i) % activePlaylist.items.length;
      const potentialTrack = activePlaylist.items[nextIndex];
      if (potentialTrack.id !== otherDeckTrackId) return potentialTrack;
    }
    return null;
  };
  
  const handleAutoFade = (sourceDeck: 'A' | 'B') => {
    if (isFading) return;
    const targetDeck = sourceDeck === 'A' ? 'B' : 'A';
    const sourceState = sourceDeck === 'A' ? deckA : deckB;
    const targetState = targetDeck === 'A' ? deckA : deckB;

    const targetAudio = targetDeck === 'A' ? audioRefA.current : audioRefB.current;
    if (targetAudio && targetState.track && !targetState.isPlaying) {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      targetAudio.play().catch(console.error);
      const setTargetState = targetDeck === 'A' ? setDeckA : setDeckB;
      setTargetState(prev => ({ ...prev, isPlaying: true }));
    }

    setIsFading(true);
    const startValue = crossfader;
    const endValue = targetDeck === 'B' ? 100 : -100;
    const duration = fadeSpeed * 1000;
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    const stepValue = (endValue - startValue) / totalSteps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      if (currentStep >= totalSteps) {
        setCrossfader(endValue);
        clearInterval(fadeIntervalRef.current!);
        setIsFading(false);
        
        if (sourceState.track) {
          const nextTrack = findNextTrack(sourceState.track.id, targetState.track?.id);
          handleStop(sourceDeck);
          if (nextTrack) loadTrack(sourceDeck, nextTrack);
        }
      } else {
        setCrossfader(prev => prev + stepValue);
      }
    }, intervalTime);
  };
  
  const handleStartCrossfade = () => {
    if (isFading) return;
    handleAutoFade(crossfader < 0 ? 'A' : 'B');
  };

  const handleTrackEnd = (endedDeck: 'A' | 'B') => {
    if (isAutoFadeEnabled) handleAutoFade(endedDeck);
    else handleStop(endedDeck);
  };

  const handleDeleteFromLibrary = async () => {
    if (!trackToDelete || !user) return;
    setIsDeleting(true);
    try {
      await deleteLocalTrack(user.uid, trackToDelete.id);
      const tracks = await refreshLocalLibrary();
      await refreshPlaylists(tracks);
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeleting(false);
      setTrackToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full gap-4">
        <div className="grid grid-cols-[1fr_minmax(200px,auto)_1fr] gap-4 items-center">
            <PlayerDeck deck="A" state={deckA} onPlay={() => togglePlay('A')} onStop={() => handleStop('A')} onSeek={a => handleSeek('A', a)} onVolumeChange={v => setDeckA(d => ({...d, volume: v[0]}))} onProgressChange={v => handleProgressChange('A', v)} onSetCue={() => setDeckA(d => ({...d, startTime: audioRefA.current?.currentTime || 0}))} />
            <Card className="flex flex-col justify-center items-center p-4 h-full bg-card/50 border-0 shadow-none">
                <CardTitle className="font-headline text-center text-xl mb-2">Mixer</CardTitle>
                 <div className="w-full flex items-center gap-4 text-sm font-bold">
                    <span className="text-primary">A</span>
                    <Slider value={[crossfader]} min={-100} max={100} step={1} onValueChange={v => setCrossfader(v[0])} />
                    <span className="text-primary">B</span>
                </div>
                <div className="mt-4 w-full space-y-3">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-20">Fade Speed</Label>
                        <Slider value={[fadeSpeed]} min={1} max={10} step={1} onValueChange={v => setFadeSpeed(v[0])} disabled={isFading} />
                        <span className="text-xs font-code w-10 text-right">{fadeSpeed}s</span>
                    </div>
                     <div className="flex items-center justify-between">
                        <Label className="text-sm">Continuous Play</Label>
                        <Switch checked={isAutoFadeEnabled} onCheckedChange={setIsAutoFadeEnabled} />
                    </div>
                    <Button onClick={handleStartCrossfade} disabled={isFading} className="w-full">{isFading ? 'Fading...' : 'Start Crossfade'}</Button>
                </div>
            </Card>
            <PlayerDeck deck="B" state={deckB} onPlay={() => togglePlay('B')} onStop={() => handleStop('B')} onSeek={a => handleSeek('B', a)} onVolumeChange={v => setDeckB(d => ({...d, volume: v[0]}))} onProgressChange={v => handleProgressChange('B', v)} onSetCue={() => setDeckB(d => ({...d, startTime: audioRefB.current?.currentTime || 0}))} />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <Card className={`flex flex-col relative transition-colors ${isDragging ? 'border-primary bg-primary/10' : ''}`} onDragEnter={() => setIsDragging(true)} onDragOver={e => e.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}>
                {isDragging && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 rounded-lg"><Upload className="h-10 w-10 text-primary animate-bounce" /><p className="mt-2 text-lg font-semibold text-primary">Drop files to upload</p></div>}
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-headline flex items-center gap-2 text-xl"><Music className="h-5 w-5"/> Library</CardTitle>
                    {hasLifetimeAccess ? (
                      <p className="text-xs text-muted-foreground">Lifetime · Unlimited</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Free · {libraryTracks.length}/{FREE_SONG_LIMIT} songs</p>
                        <Button size="sm" className="h-7" onClick={handleLifetimePurchase} disabled={isStartingCheckout}>
                          {isStartingCheckout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Unlock $9.99</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Audio stays on this device and is not uploaded to We-be.</p>
                </CardHeader>
                <CardContent className="p-0 flex flex-col overflow-hidden">
                   <Tabs defaultValue="songs" className="flex-1 flex flex-col">
                     <div className="flex items-center justify-between px-4 py-2 border-b">
                        <TabsList><TabsTrigger value="songs">Songs</TabsTrigger><TabsTrigger value="commercials">Commercials</TabsTrigger></TabsList>
	                        <div className="flex gap-2">
	                           <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} accept="audio/*" multiple className="hidden" />
	                           <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}<span className="ml-2">Add Songs</span></Button>
	                           <DropdownMenu>
	                             <DropdownMenuTrigger asChild>
	                               <Button size="sm" variant="outline" disabled={isMusicLibraryImporting}>
	                                 {isMusicLibraryImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
	                                 <span className="ml-2">Sync iTunes</span>
	                               </Button>
	                             </DropdownMenuTrigger>
	                             <DropdownMenuContent align="end">
	                               <DropdownMenuItem onClick={() => handleMusicLibraryImport('chooseSongs')}>Choose Songs</DropdownMenuItem>
	                               <DropdownMenuItem onClick={() => handleMusicLibraryImport('importPlayableLibrary')}>Import Playable Library</DropdownMenuItem>
	                             </DropdownMenuContent>
	                           </DropdownMenu>
	                           <AddCommercialDialog onAdd={handleAddCommercial} />
	                        </div>
                     </div>
                     <TabsContent value="songs" className="flex-1 overflow-hidden mt-0"><ScrollArea className="h-full"><div className="p-2 pt-0"><TrackTable tracks={libraryTracks} onLoadA={t => loadTrack('A', t)} onLoadB={t => loadTrack('B', t)} onPreview={t => { previewAudioRef.current!.src = t.url; previewAudioRef.current!.play(); }} onAddToPlaylist={handleAddToPlaylist} onDeleteFromLibrary={setTrackToDelete}/></div></ScrollArea></TabsContent>
                     <TabsContent value="commercials" className="flex-1 overflow-hidden mt-0"><ScrollArea className="h-full"><div className="p-2 pt-0"><Accordion type="single" collapsible>{Object.entries(groupedCommercials).map(([c, tracks]) => (<AccordionItem value={c} key={c}><AccordionTrigger className="px-2 py-2 text-sm">{c}</AccordionTrigger><AccordionContent><TrackTable tracks={tracks} onLoadA={t => loadTrack('A', t)} onLoadB={t => loadTrack('B', t)} onPreview={t => { previewAudioRef.current!.src = t.url; previewAudioRef.current!.play(); }} onAddToPlaylist={handleAddToPlaylist} onDeleteFromLibrary={setTrackToDelete}/></AccordionContent></AccordionItem>))}</Accordion></div></ScrollArea></TabsContent>
                   </Tabs>
                </CardContent>
            </Card>
             <Card className="flex flex-col">
                <CardHeader className="p-4 flex flex-row items-center justify-between"><CardTitle className="font-headline flex items-center gap-2 text-xl"><ListMusic className="h-5 w-5"/> Playlist: {activePlaylist?.name || 'None'}</CardTitle>
                    <div className='flex gap-2 items-center'><Select onValueChange={handlePlaylistChange} value={activePlaylist?.id || ''}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Playlist" /></SelectTrigger><SelectContent>{playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><Dialog open={isNewPlaylistDialogOpen} onOpenChange={setIsNewPlaylistDialogOpen}><DialogTrigger asChild><Button size="sm">New Playlist</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create New Playlist</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><Label>Playlist Name</Label><Input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} /></div><DialogFooter><Button onClick={handleCreatePlaylist}>Create</Button></DialogFooter></DialogContent></Dialog></div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0"><ScrollArea className="h-full"><div className="p-2 pt-0">{activePlaylist && <TrackTable tracks={activePlaylist.items} onLoadA={t => loadTrack('A', t)} onLoadB={t => loadTrack('B', t)} onPreview={t => { previewAudioRef.current!.src = t.url; previewAudioRef.current!.play(); }} onRemoveFromPlaylist={handleRemoveFromPlaylist} onDeleteFromLibrary={setTrackToDelete} isPlaylist={true}/>}</div></ScrollArea></CardContent>
            </Card>
        </div>
        <AlertDialog open={!!trackToDelete} onOpenChange={o => !o && setTrackToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete "{trackToDelete?.title}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteFromLibrary}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <audio ref={audioRefA} onEnded={() => handleTrackEnd('A')} crossOrigin="anonymous" />
        <audio ref={audioRefB} onEnded={() => handleTrackEnd('B')} crossOrigin="anonymous" />
        <audio ref={previewAudioRef} />
    </div>
  );
}
