import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, AlertTriangle, Lightbulb, Clock, FileAudio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TranscriptionData } from "@/types/transcription";

interface TranscriptionResultsProps {
  transcription: TranscriptionData;
  onUpdate: (updates: Partial<TranscriptionData>) => void;
}

export const TranscriptionResults = ({ transcription }: TranscriptionResultsProps) => {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied to your clipboard"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy text to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadTranscript = () => {
    const content = `
Call Transcription Report
========================

Timestamp: ${new Date(transcription.timestamp).toLocaleString()}
Duration: ${Math.floor(transcription.duration / 60)}:${(transcription.duration % 60).toString().padStart(2, '0')}
Status: ${transcription.status}

Transcript:
-----------
${transcription.transcript}

Anomalies Detected:
------------------
${transcription.anomalies.length > 0 ? transcription.anomalies.map(a => `• ${a}`).join('\n') : 'None detected'}

Suggestions:
-----------
${transcription.suggestions.length > 0 ? transcription.suggestions.map(s => `• ${s}`).join('\n') : 'None available'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${transcription.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Transcript report has been downloaded"
    });
  };

  const downloadAudioFile = async () => {
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'processing': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Transcription Results
                <Badge className={getStatusColor(transcription.status)}>
                  {transcription.status}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(transcription.timestamp).toLocaleString()}
                </span>
                <span>Duration: {formatDuration(transcription.duration)}</span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(transcription.transcript)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadTranscript}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              {transcription.audioUrl && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadAudioFile}
                >
                  <FileAudio className="w-4 h-4 mr-2" />
                  Download Audio
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>
            Full transcription of the audio content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transcription.status === 'processing' ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Processing audio...</span>
            </div>
          ) : transcription.status === 'error' ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Error during transcription</p>
              <p className="text-muted-foreground">Please try again with a different audio file</p>
            </div>
          ) : (
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {transcription.transcript || 'No transcript available'}
              </p>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Anomalies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Anomalies Detected ({transcription.anomalies.length})
            </CardTitle>
            <CardDescription>
              Unusual patterns or issues found in the conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transcription.anomalies.length > 0 ? (
              <div className="space-y-3">
                {transcription.anomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm">{anomaly}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No anomalies detected</p>
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Lightbulb className="w-5 h-5" />
              Suggestions ({transcription.suggestions.length})
            </CardTitle>
            <CardDescription>
              AI-generated recommendations for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transcription.suggestions.length > 0 ? (
              <div className="space-y-3">
                {transcription.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm">{suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No suggestions available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};