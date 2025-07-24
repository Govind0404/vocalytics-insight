import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileAudio, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioUploaderProps {
  onTranscriptionStart: (data: any) => void;
}

export const AudioUploader = ({ onTranscriptionStart }: AudioUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/webm'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid audio file (WAV, MP3, M4A, or WebM)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 50MB",
          variant: "destructive"
        });
        return;
      }

      setFile(selectedFile);
    }
  }, [toast]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an audio file to upload",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Start transcription process
      onTranscriptionStart({
        status: 'processing',
        transcript: '',
        anomalies: [],
        suggestions: [],
        duration: 0
      });

      // Convert file to base64
      const base64Audio = await convertFileToBase64(file);
      setProgress(30);

      // Call the transcription edge function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64Audio,
          fileName: file.name,
          fileType: file.type
        }
      });

      setProgress(70);

      if (error) {
        throw new Error(error.message || 'Transcription failed');
      }

      setProgress(100);

      // Process the response
      onTranscriptionStart({
        status: 'completed',
        transcript: data.transcript || 'No transcript available',
        anomalies: data.anomalies || [],
        suggestions: data.suggestions || [],
        duration: data.duration || 0
      });

      toast({
        title: "Transcription completed",
        description: "Your audio has been successfully transcribed and analyzed"
      });

      // Reset state
      setFile(null);
      setProgress(0);

    } catch (error) {
      console.error('Upload error:', error);
      
      onTranscriptionStart({
        status: 'error',
        transcript: 'Error during transcription',
        anomalies: [],
        suggestions: [],
        duration: 0
      });

      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <Card 
          className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <Label htmlFor="audio-upload" className="text-lg font-medium cursor-pointer">
              Drag and drop your audio file here
            </Label>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              or click to browse (WAV, MP3, M4A, WebM - max 50MB)
            </p>
            <Input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" onClick={() => document.getElementById('audio-upload')?.click()}>
              Choose File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileAudio className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!uploading && (
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        className="w-full"
        size="lg"
      >
        {uploading ? "Processing..." : "Transcribe Audio"}
      </Button>
    </div>
  );
};