'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertTriangle } from 'lucide-react';

export function AudioPreview() {
  const [isMicOn, setIsMicOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number>(0);

  const startMic = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;
        
        setIsMicOn(true);
        setError(null);
        visualize();
      } else {
        throw new Error('getUserMedia not supported on your browser!');
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
      setIsMicOn(false);
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    setIsMicOn(false);
  };

  const visualize = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      if(canvasCtx) {
        canvasCtx.fillStyle = '#E6E6FA'; // light lavender
        const { width, height } = canvas;
        canvasCtx.fillRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i];
          
          const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
          canvasCtx.fillStyle = `hsl(${primaryColor})`
          canvasCtx.fillRect(x, height - barHeight / 2, barWidth, barHeight / 2);
          x += barWidth + 1;
        }
      }
    };
    draw();
  };

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, []);

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2 text-2xl">
            <Mic className="h-6 w-6" /> Audio Preview
        </CardTitle>
        <CardDescription>
          Check your microphone levels before you go live.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4">
        <div className="w-full h-24 rounded-lg bg-background border flex items-center justify-center">
            {isMicOn ? (
                 <canvas ref={canvasRef} className="w-full h-full" />
            ) : (
                <p className="text-sm text-muted-foreground">{error ? 'Error' : 'Mic is off'}</p>
            )}
        </div>
        {error && (
            <div className="text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4"/>
                {error}
            </div>
        )}
        <Button onClick={toggleMic} variant={isMicOn ? 'destructive' : 'default'} className="w-full">
          {isMicOn ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {isMicOn ? 'Turn Mic Off' : 'Turn Mic On'}
        </Button>
      </CardContent>
    </Card>
  );
}
