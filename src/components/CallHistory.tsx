import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Clock, AlertTriangle, Lightbulb, FileAudio, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TranscriptionData } from "@/types/transcription";

interface CallHistoryProps {
  transcriptions: TranscriptionData[];
  onSelectTranscription: (transcription: TranscriptionData) => void;
}

export const CallHistory = ({ transcriptions, onSelectTranscription }: CallHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredTranscriptions = transcriptions.filter(t => 
    t.transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(t.timestamp).toLocaleString().includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'processing': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const downloadAudioFile = async (transcription: TranscriptionData, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the card click
    
    if (!transcription.audioUrl) {
      toast({
        title: "Audio file not available",
        description: "No audio file is associated with this transcription",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('audio-files')
        .download(transcription.audioUrl);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = transcription.fileName || 'audio-file';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Audio file has been downloaded"
      });
    } catch (error) {
      console.error('Audio download error:', error);
      toast({
        title: "Download failed",
        description: "Could not download the audio file",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            View and manage your previous transcriptions
          </CardDescription>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search transcriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12">
              <FileAudio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {transcriptions.length === 0 ? "No transcriptions yet" : "No matches found"}
              </h3>
              <p className="text-muted-foreground">
                {transcriptions.length === 0 
                  ? "Upload or record audio to get started with transcription"
                  : "Try adjusting your search terms"
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredTranscriptions.map((transcription) => (
                  <Card 
                    key={transcription.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onSelectTranscription(transcription)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(transcription.status)}>
                                {transcription.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(transcription.timestamp).toLocaleDateString()} at {new Date(transcription.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Duration: {formatDuration(transcription.duration)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {transcription.audioUrl && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => downloadAudioFile(transcription, e)}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Audio
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>

                        {/* Transcript Preview */}
                        <div>
                          <p className="text-sm leading-relaxed">
                            {truncateText(transcription.transcript || "No transcript available")}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-orange-500" />
                            {transcription.anomalies.length} anomalies
                          </span>
                          <span className="flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-blue-500" />
                            {transcription.suggestions.length} suggestions
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};