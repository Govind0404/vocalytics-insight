import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, Pause } from "lucide-react";

interface LiveRecorderProps {
  onTranscriptionUpdate: (data: any) => void;
}

export const LiveRecorder = ({ onTranscriptionUpdate }: LiveRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone"
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      toast({
        title: "Recording stopped",
        description: "Processing your audio for transcription..."
      });
    }
  }, [isRecording, toast]);

  const playRecording = useCallback(() => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    }
  }, [audioBlob, isPlaying]);

  const transcribeRecording = useCallback(async () => {
    if (!audioBlob) {
      toast({
        title: "No recording",
        description: "Please record audio first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));

      onTranscriptionUpdate({
        status: 'processing',
        transcript: '',
        anomalies: [],
        suggestions: [],
        duration
      });

      // Here we would call the transcription service
      // For now, simulate the process
      setTimeout(() => {
        onTranscriptionUpdate({
          status: 'completed',
          transcript: 'Live recording transcription will be processed here...',
          anomalies: ['Detected fast speech pattern'],
          suggestions: ['Consider speaking more slowly for clarity'],
          duration
        });
      }, 2000);

      toast({
        title: "Processing complete",
        description: "Your recording has been transcribed"
      });

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: "An error occurred during transcription",
        variant: "destructive"
      });
    }
  }, [audioBlob, duration, onTranscriptionUpdate, toast]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setDuration(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            {/* Recording Status */}
            <div className="space-y-2">
              <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted'
              }`}>
                <Mic className={`w-12 h-12 ${isRecording ? 'text-white' : 'text-muted-foreground'}`} />
              </div>
              <p className="text-lg font-medium">
                {isRecording ? 'Recording...' : audioBlob ? 'Recording Complete' : 'Ready to Record'}
              </p>
              <p className="text-2xl font-mono text-primary">
                {formatDuration(duration)}
              </p>
            </div>

            {/* Recording Controls */}
            <div className="flex justify-center space-x-4">
              {!isRecording ? (
                <Button 
                  onClick={startRecording}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={!!audioBlob}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  size="lg"
                  variant="outline"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              )}

              {audioBlob && (
                <>
                  <Button 
                    onClick={playRecording}
                    size="lg"
                    variant="outline"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  
                  <Button 
                    onClick={resetRecording}
                    size="lg"
                    variant="ghost"
                  >
                    Reset
                  </Button>
                </>
              )}
            </div>

            {/* Transcribe Button */}
            {audioBlob && (
              <Button 
                onClick={transcribeRecording}
                size="lg"
                className="w-full"
              >
                Transcribe Recording
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
};