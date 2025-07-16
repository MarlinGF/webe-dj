
'use client';

import { useState, useRef, useEffect, type FC, type ChangeEvent } from 'react';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import { db, storage } from '@/lib/firebase';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Trash2,
  X,
  FileAudio,
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


export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url: string; 
  storagePath: string;
  createdAt?: any;
  type: 'song' | 'commercial';
  client?: string;
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
    onDeleteFromLibrary?: (track: Track) => void;
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
  
  // Library State
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [commercials, setCommercials] = useState<Track[]>([]);
  const [groupedCommercials, setGroupedCommercials] = useState<Record<string, Track[]>>({});

  // Playlist State
  const [playlists, setPlaylists] = useState<{ id: string, name: string }[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // UI/Control State
  const [crossfader, setCrossfader] = useState(-100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fadeSpeed, setFadeSpeed] = useState(2); // seconds
  const [isAutoFadeEnabled, setIsAutoFadeEnabled] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isNewPlaylistDialogOpen, setIsNewPlaylistDialogOpen] = useState(false);

  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  
  const sourceRefA = useRef<MediaElementAudioSourceNode | null>(null);
  const sourceRefB = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRefA = useRef<GainNode | null>(null);
  const gainRefB = useRef<GainNode | null>(null);
  const analyserRefA = useRef<AnalyserNode | null>(null);
  const analyserRefB = useRef<AnalyserNode | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

    // One-time setup for the audio context and graph
    useEffect(() => {
        const setupAudioContext = () => {
            if (!audioContextRef.current) {
                try {
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    audioContextRef.current = context;

                    // --- Setup for Deck A ---
                    if (audioRefA.current) {
                        sourceRefA.current = context.createMediaElementSource(audioRefA.current);
                        gainRefA.current = context.createGain();
                        analyserRefA.current = context.createAnalyser();
                        analyserRefA.current.fftSize = 1024;

                        sourceRefA.current
                            .connect(gainRefA.current)
                            .connect(analyserRefA.current)
                            .connect(context.destination);
                        
                        setDeckA(d => ({ ...d, analyser: analyserRefA.current }));
                    }

                    // --- Setup for Deck B ---
                    if (audioRefB.current) {
                        sourceRefB.current = context.createMediaElementSource(audioRefB.current);
                        gainRefB.current = context.createGain();
                        analyserRefB.current = context.createAnalyser();
                        analyserRefB.current.fftSize = 1024;

                        sourceRefB.current
                            .connect(gainRefB.current)
                            .connect(analyserRefB.current)
                            .connect(context.destination);

                        setDeckB(d => ({ ...d, analyser: analyserRefB.current }));
                    }
                } catch (e) {
                    console.error("Error initializing AudioContext:", e);
                    toast({
                        variant: 'destructive',
                        title: 'Audio Error',
                        description: 'Could not initialize the Web Audio API on this browser.',
                    });
                }
            }
        };

        setupAudioContext();

        // No cleanup needed for the context itself, it lasts for the component's lifetime
    }, [toast]);


  // Fetch Songs
  useEffect(() => {
    if (!user) {
      setLibraryTracks([]);
      return;
    }
    const tracksCollection = collection(db, 'users', user.uid, 'tracks');
    const q = query(tracksCollection, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tracksData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'song' } as Track));
      setLibraryTracks(tracksData);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Commercials
  useEffect(() => {
    if (!user) {
        setCommercials([]);
        return;
    }
    const commercialsCollection = collection(db, 'users', user.uid, 'commercials');
    const q = query(commercialsCollection, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const commercialsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'commercial' } as Track));
        setCommercials(commercialsData);
    });
    return () => unsubscribe();
  }, [user]);

  // Group Commercials by Client
  useEffect(() => {
    const groups = commercials.reduce((acc, comm) => {
        const client = comm.client || 'Unknown Client';
        if (!acc[client]) {
            acc[client] = [];
        }
        acc[client].push(comm);
        return acc;
    }, {} as Record<string, Track[]>);
    setGroupedCommercials(groups);
  }, [commercials]);

  // Fetch Playlists list
   useEffect(() => {
    if (!user) {
      setPlaylists([]);
      setActivePlaylist(null);
      return;
    }
    const playlistsCollection = collection(db, 'users', user.uid, 'playlists');
    const unsubscribe = onSnapshot(playlistsCollection, (snapshot) => {
        const playlistsData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setPlaylists(playlistsData);
        if (!activePlaylist && playlistsData.length > 0) {
            handlePlaylistChange(playlistsData[0].id);
        } else if (playlistsData.length === 0) {
            setActivePlaylist(null);
        }
    });
    return () => unsubscribe();
  }, [user, activePlaylist?.id]);

  const handlePlaylistChange = async (playlistId: string) => {
    if (!user || !playlistId) return;
    
    const playlistDocRef = doc(db, 'users', user.uid, 'playlists', playlistId);
    const playlistSnap = await getDoc(playlistDocRef);

    if (!playlistSnap.exists()) {
        setActivePlaylist(null);
        return;
    }

    const playlistData = playlistSnap.data();
    const itemRefs = playlistData.items || [];

    const resolvedItems = await Promise.all(
        itemRefs.map(async (item: { id: string, type: 'song' | 'commercial' }) => {
            const collectionName = item.type === 'song' ? 'tracks' : 'commercials';
            const docRef = doc(db, 'users', user.uid, collectionName, item.id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id, type: item.type } as Track : null;
        })
    );
    
    setActivePlaylist({
        id: playlistId,
        name: playlistData.name,
        items: resolvedItems.filter(Boolean) as Track[],
    });
  };

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;

    try {
        const playlistsCollection = collection(db, 'users', user.uid, 'playlists');
        const newPlaylistRef = await addDoc(playlistsCollection, {
            name: newPlaylistName,
            items: [],
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Playlist Created', description: `"${newPlaylistName}" has been created.` });
        setNewPlaylistName('');
        setIsNewPlaylistDialogOpen(false);
        handlePlaylistChange(newPlaylistRef.id);
    } catch (error) {
        console.error("Error creating playlist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create playlist.' });
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


  // Update track progress
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    const updateProgress = (audio: HTMLAudioElement, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
        if (!audio || !audio.duration) return;
        const progress = (audio.currentTime / audio.duration) * 100;
        setDeck(d => ({ ...d, progress: isNaN(progress) ? 0 : progress, currentTime: audio.currentTime }));
    };
    
    const intervalA = setInterval(() => { if (deckA.isPlaying && audioA) updateProgress(audioA, setDeckA) }, 250);
    const intervalB = setInterval(() => { if (deckB.isPlaying && audioB) updateProgress(audioB, setDeckB) }, 250);
    
    return () => {
        clearInterval(intervalA);
        clearInterval(intervalB);
    };
  }, [deckA.isPlaying, deckB.isPlaying]);


  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;

    setIsProcessing(true);

    for (const file of Array.from(files)) {
      const storagePath = `users/${user.uid}/tracks/${Date.now()}-${file.name}`;
      const trackStorageRef = storageRef(storage, storagePath);
      const uploadTask = uploadBytesResumable(trackStorageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          // Optional: handle progress updates
        },
        (error) => {
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: `Could not upload ${file.name}. Error: ${error.message}`,
          });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const duration = await new Promise<number>((resolve, reject) => {
              const audio = document.createElement('audio');
              audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
              audio.addEventListener('error', () => reject(`Error loading audio duration for ${file.name}`));
              audio.src = downloadURL;
            });

            const tracksCollection = collection(db, 'users', user.uid, 'tracks');
            await addDoc(tracksCollection, {
              title: file.name.replace(/\.[^/.]+$/, ""),
              artist: 'Unknown Artist',
              duration: duration,
              url: downloadURL,
              storagePath: storagePath,
              createdAt: serverTimestamp(),
            });
          } catch (innerError) {
             console.error('Error processing file after upload:', file.name, innerError);
             toast({
                variant: 'destructive',
                title: 'Processing Failed',
                description: `Could not process ${file.name} after upload.`,
             });
          }
        }
      );
    }
    setIsProcessing(false);
  };


  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
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
    
    console.log(`Deck ${deck} loading track:`, track.title);

    setDeck(prev => {
        if (prev.isPlaying && audioRef.current) {
          audioRef.current.pause();
        }
        return { ...initialDeckState, track: track, volume: prev.volume, startTime: 0, analyser: prev.analyser };
    });
    
    if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.load();
        audioRef.current.onloadedmetadata = () => {
            setDeck(d => {
                if (audioRef.current) audioRef.current.currentTime = d.startTime;
                return d;
            });
        };
    }
  };
  
  const togglePlay = (deck: 'A' | 'B') => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

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
    const state = deck === 'A' ? deckA : deckB;
    const setState = deck === 'A' ? setDeckA : setDeckB;

    if (audioRef.current && state.track) {
        const newTime = (state.track.duration * value[0]) / 100;
        audioRef.current.currentTime = newTime;
        setState(d => ({...d, progress: value[0], currentTime: newTime}));
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
  
  const findNextTrack = (finishedTrackId: string, otherDeckTrackId?: string) => {
    if (!activePlaylist || activePlaylist.items.length < 2) {
      console.log('Playlist has less than 2 tracks, cannot find next.');
      return null;
    }
  
    const finishedTrackIndex = activePlaylist.items.findIndex(t => t.id === finishedTrackId);
  
    if (finishedTrackIndex === -1) {
      console.log('Could not find finished track in playlist. Defaulting to first available.');
      return activePlaylist.items.find(t => t.id !== otherDeckTrackId) || null;
    }
  
    // Loop through playlist starting from the track *after* the finished one
    for (let i = 1; i < activePlaylist.items.length; i++) {
      const nextIndex = (finishedTrackIndex + i) % activePlaylist.items.length;
      const potentialTrack = activePlaylist.items[nextIndex];
      // The next track cannot be the one currently loaded on the other deck
      if (potentialTrack.id !== otherDeckTrackId) {
        console.log('Next track found:', potentialTrack.title);
        return potentialTrack;
      }
    }
  
    console.log('No suitable next track found.');
    return null;
  };
  
  const handleAutoFade = (sourceDeck: 'A' | 'B') => {
    if (isFading) return;
  
    const targetDeck = sourceDeck === 'A' ? 'B' : 'A';
    const sourceState = sourceDeck === 'A' ? deckA : deckB;
    const targetState = targetDeck === 'A' ? deckA : deckB;
  
    if (!targetState.track) {
      console.log(`Auto-fade cancelled: Target deck ${targetDeck} has no track.`);
      handleStop(sourceDeck);
      return;
    }
  
    console.log(`Auto-fade: Starting playback on Deck ${targetDeck}`);
    togglePlay(targetDeck); // Start the target deck immediately
  
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
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        setIsFading(false);
        console.log(`Auto-fade to Deck ${targetDeck} complete.`);
  
        // Now that the fade is done, find and load the next track for the source deck
        if (sourceState.track) {
          const nextTrack = findNextTrack(sourceState.track.id, targetState.track?.id);
          handleStop(sourceDeck);
          if (nextTrack) {
            console.log(`Loading next track on Deck ${sourceDeck}: ${nextTrack.title}`);
            loadTrack(sourceDeck, nextTrack);
          } else {
            console.log(`Stopping deck ${sourceDeck}, no next track to load.`);
          }
        }
      } else {
        setCrossfader(prev => prev + stepValue);
      }
    }, intervalTime);
  };
  
  const handleStartCrossfade = () => {
    if (isFading) return;
    const sourceDeck = crossfader < 0 ? 'A' : 'B';
    handleAutoFade(sourceDeck);
  };

  const handleTrackEnd = (endedDeck: 'A' | 'B') => {
    console.log(`Track ended on Deck ${endedDeck}. Auto-fade enabled: ${isAutoFadeEnabled}`);
    if (isAutoFadeEnabled) {
      handleAutoFade(endedDeck);
    } else {
      handleStop(endedDeck);
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

  const handleAddToPlaylist = async (track: Track) => {
    if (!user || !activePlaylist) {
        toast({ variant: 'destructive', title: 'No active playlist', description: 'Please select or create a playlist first.' });
        return;
    }

    const currentItemIds = new Set(activePlaylist.items.map(item => item.id));
    if (currentItemIds.has(track.id)) {
        toast({ title: 'Track already in playlist' });
        return;
    }

    try {
        const playlistDocRef = doc(db, 'users', user.uid, 'playlists', activePlaylist.id);
        const newItemRef = { id: track.id, type: track.type };
        const updatedItems = [...activePlaylist.items.map(i => ({id: i.id, type: i.type})), newItemRef];
        
        await updateDoc(playlistDocRef, {
            items: updatedItems
        });

        setActivePlaylist(p => p ? { ...p, items: [...p.items, track] } : null);
        toast({ title: `Added "${track.title}" to "${activePlaylist.name}"` });
    } catch (error) {
        console.error("Error adding to playlist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add track to playlist.' });
    }
  };

  const handleRemoveFromPlaylist = async (trackId: string) => {
    if (!user || !activePlaylist) return;

    try {
        const playlistDocRef = doc(db, 'users', user.uid, 'playlists', activePlaylist.id);
        const updatedItems = activePlaylist.items.filter(item => item.id !== trackId).map(i => ({id: i.id, type: i.type}));

        await updateDoc(playlistDocRef, { items: updatedItems });

        setActivePlaylist(p => p ? { ...p, items: p.items.filter(item => item.id !== trackId) } : null);
        toast({ title: 'Track removed from playlist' });
    } catch (error) {
        console.error("Error removing from playlist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove track from playlist.' });
    }
  };
  
  const handleDeleteFromLibrary = async () => {
    if (!trackToDelete || !user) return;

    setIsDeleting(true);
    try {
      // Delete from Storage
      const fileRef = storageRef(storage, trackToDelete.storagePath);
      await deleteObject(fileRef);

      // Delete from Firestore
      const collectionName = trackToDelete.type === 'song' ? 'tracks' : 'commercials';
      const trackDocRef = doc(db, 'users', user.uid, collectionName, trackToDelete.id);
      await deleteDoc(trackDocRef);

      toast({
        title: 'Item Deleted',
        description: `"${trackToDelete.title}" has been removed from your library.`,
      });

    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: `Could not delete "${trackToDelete.title}". Please try again.`,
      });
    } finally {
      setIsDeleting(false);
      setTrackToDelete(null);
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
                    <div className="flex items-center gap-2">
                        <Label htmlFor="fadespeed-slider" className="text-xs text-muted-foreground w-20">Fade Speed</Label>
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
                     <div className="flex items-center justify-between">
                        <Label htmlFor="autofade-switch" className="text-sm">Continuous Play</Label>
                        <Switch
                            id="autofade-switch"
                            checked={isAutoFadeEnabled}
                            onCheckedChange={setIsAutoFadeEnabled}
                        />
                    </div>
                    <Button onClick={handleStartCrossfade} disabled={isFading} className="w-full">
                        {isFading ? 'Fading...' : 'Start Crossfade'}
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
                <CardHeader className="p-4 pb-0">
                    <CardTitle className="font-headline flex items-center gap-2 text-xl"><Music className="h-5 w-5"/> Library</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                   <Tabs defaultValue="songs" className="flex-1 flex flex-col">
                     <div className="flex items-center justify-between px-4 py-2 border-b">
                        <TabsList>
                           <TabsTrigger value="songs">Songs</TabsTrigger>
                           <TabsTrigger value="commercials">Commercials</TabsTrigger>
                        </TabsList>
                        <div className="flex gap-2">
                           <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*" multiple className="hidden" />
                           <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              <span className="ml-2">Add Songs</span>
                           </Button>
                           <AddCommercialDialog user={user} />
                        </div>
                     </div>
                     <TabsContent value="songs" className="flex-1 overflow-hidden mt-0">
                       <ScrollArea className="h-full">
                         <div className="p-2 pt-0">
                            {libraryTracks.length > 0 ? (
                                <TrackTable tracks={libraryTracks} onLoadA={track => loadTrack('A', track)} onLoadB={track => loadTrack('B', track)} onPreview={previewTrack} onAddToPlaylist={handleAddToPlaylist} onDeleteFromLibrary={setTrackToDelete}/>
                            ) : (
                               <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center"><p>Your song library is empty. Click "Add Songs" or drag and drop files.</p></div>
                            )}
                         </div>
                       </ScrollArea>
                     </TabsContent>
                     <TabsContent value="commercials" className="flex-1 overflow-hidden mt-0">
                       <ScrollArea className="h-full">
                         <div className="p-2 pt-0">
                           {Object.keys(groupedCommercials).length > 0 ? (
                              <Accordion type="single" collapsible className="w-full">
                                {Object.entries(groupedCommercials).map(([client, comms]) => (
                                  <AccordionItem value={client} key={client}>
                                    <AccordionTrigger className="px-2 py-2 text-sm font-semibold">{client}</AccordionTrigger>
                                    <AccordionContent>
                                      <TrackTable tracks={comms} onLoadA={track => loadTrack('A', track)} onLoadB={track => loadTrack('B', track)} onPreview={previewTrack} onAddToPlaylist={handleAddToPlaylist} onDeleteFromLibrary={setTrackToDelete}/>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                           ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center"><p>No commercials found. Click "Add Commercial" to upload.</p></div>
                           )}
                         </div>
                       </ScrollArea>
                     </TabsContent>
                   </Tabs>
                </CardContent>
            </Card>

             <Card className="flex flex-col">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                    <CardTitle className="font-headline flex items-center gap-2 text-xl"><ListMusic className="h-5 w-5"/> Playlist: {activePlaylist?.name || 'None'}</CardTitle>
                    <div className='flex gap-2 items-center'>
                         <Select onValueChange={handlePlaylistChange} value={activePlaylist?.id || ''}>
                           <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Playlist" />
                           </SelectTrigger>
                           <SelectContent>
                              {playlists.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                           </SelectContent>
                         </Select>
                        <Dialog open={isNewPlaylistDialogOpen} onOpenChange={setIsNewPlaylistDialogOpen}>
                           <DialogTrigger asChild>
                              <Button size="sm">New Playlist</Button>
                           </DialogTrigger>
                           <DialogContent>
                              <DialogHeader>
                                 <DialogTitle>Create New Playlist</DialogTitle>
                                 <DialogDescription>Enter a name for your new playlist.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                 <Label htmlFor="playlist-name">Playlist Name</Label>
                                 <Input id="playlist-name" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
                              </div>
                              <DialogFooter>
                                 <Button onClick={handleCreatePlaylist}>Create</Button>
                              </DialogFooter>
                           </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                   <ScrollArea className="h-full">
                     <div className="p-2 pt-0">
                       {activePlaylist && activePlaylist.items.length > 0 ? (
                           <TrackTable tracks={activePlaylist.items} onLoadA={track => loadTrack('A', track)} onLoadB={track => loadTrack('B', track)} onPreview={previewTrack} onRemoveFromPlaylist={handleRemoveFromPlaylist} isPlaylist={true}/>
                       ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                               <p>{activePlaylist ? 'This playlist is empty. Add tracks from the library.' : 'Select or create a playlist to get started.'}</p>
                           </div>
                       )}
                     </div>
                   </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <AlertDialog open={!!trackToDelete} onOpenChange={(open) => !open && setTrackToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete "{trackToDelete?.title}" from your library and storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFromLibrary} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <audio ref={audioRefA} onEnded={() => handleTrackEnd('A')} crossOrigin="anonymous" />
        <audio ref={audioRefB} onEnded={() => handleTrackEnd('B')} crossOrigin="anonymous" />
        <audio ref={previewAudioRef} />
    </div>
  );
}
