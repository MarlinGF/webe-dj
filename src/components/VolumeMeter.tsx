
'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface VolumeMeterProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const LED_COUNT = 10;
const MIN_DB = -60;
const MAX_DB = 0;

export function VolumeMeter({ analyser, isPlaying }: VolumeMeterProps) {
  const [level, setLevel] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!analyser || !isPlaying) {
      setLevel(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const db = 20 * Math.log10(rms / 255);
      
      let newLevel = 0;
      if (isFinite(db)) {
        const dbClamped = Math.max(MIN_DB, Math.min(db, MAX_DB));
        newLevel = Math.floor(((dbClamped - MIN_DB) / (MAX_DB - MIN_DB)) * (LED_COUNT + 1));
      }
      
      setLevel(currentLevel => {
        // Smoothly fall back down
        if (newLevel < currentLevel) {
          return Math.max(newLevel, currentLevel - 1);
        }
        return newLevel;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <div className="flex flex-col-reverse gap-0.5 items-center">
      {Array.from({ length: LED_COUNT }).map((_, i) => {
        const ledIndex = i + 1;
        const isActive = ledIndex <= level;
        const colorClass = isActive
          ? ledIndex <= 5
            ? 'bg-green-500 shadow-led-green'
            : ledIndex <= 8
            ? 'bg-yellow-500 shadow-led-yellow'
            : 'bg-red-500 shadow-led-red'
          : 'bg-gray-700/50';

        return (
          <div
            key={i}
            className={cn('w-2 h-1 rounded-sm transition-colors duration-75', colorClass)}
          />
        );
      })}
    </div>
  );
}
