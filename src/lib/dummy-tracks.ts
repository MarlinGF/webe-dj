// NOTE: You need to place your actual audio files in the `/public/audio` directory
// and update the `url` property for each track below.

export interface Track {
    id: number;
    title: string;
    artist: string;
    duration: number; // in seconds
    url: string; 
  }
  
  export const tracks: Track[] = [
    {
      id: 1,
      title: 'Synthwave Dreams',
      artist: 'Cyber-Funk',
      duration: 210,
      url: '/audio/track1.mp3', // Placeholder
    },
    {
      id: 2,
      title: 'Lo-Fi Chill',
      artist: 'Study Beats',
      duration: 185,
      url: '/audio/track2.mp3', // Placeholder
    },
    {
      id: 3,
      title: 'Future Bass Drop',
      artist: 'DJ Sparkle',
      duration: 240,
      url: '/audio/track3.mp3', // Placeholder
    },
    {
      id: 4,
      title: 'Ambient Waves',
      artist: 'Deep Space',
      duration: 300,
      url: '/audio/track4.mp3', // Placeholder
    },
     {
      id: 5,
      title: 'Retro Gaming',
      artist: '8-Bit Hero',
      duration: 150,
      url: '/audio/track5.mp3', // Placeholder
    },
  ];
  