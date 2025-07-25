import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioUploader } from "./AudioUploader";
import { LiveRecorder } from "./LiveRecorder";
import { TranscriptionResults } from "./TranscriptionResults";
import { ComprehensiveCallAnalysis } from "./ComprehensiveCallAnalysis";
import { CallHistory } from "./CallHistory";
import { TranscriptionData, CallAnalysis } from "@/types/transcription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const CallTranscriptionDashboard = () => {
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [activeTranscription, setActiveTranscription] = useState<TranscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch transcriptions from database
  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const fetchTranscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedTranscriptions: TranscriptionData[] = data.map(item => {
        // Extract anomalies and suggestions from analysis if available
        let anomalies: string[] = [];
        let suggestions: string[] = [];
        let analysis: CallAnalysis | undefined = undefined;
        
        if (item.analysis && typeof item.analysis === 'object' && !Array.isArray(item.analysis)) {
          analysis = item.analysis as unknown as CallAnalysis;
          if (analysis.anomalies) {
            anomalies = [
              ...(analysis.anomalies.caller?.positive || []),
              ...(analysis.anomalies.caller?.negative || []),
              ...(analysis.anomalies.receiver?.positive || []),
              ...(analysis.anomalies.receiver?.negative || [])
            ];
          }
          suggestions = analysis.suggestions || [];
        }

        return {
          id: item.id,
          transcript: item.transcript || '',
          timestamp: item.created_at,
          anomalies,
          suggestions,
          duration: item.duration || 0,
          status: 'completed' as const,
          analysis,
          audioUrl: item.audio_file_path || undefined,
          fileName: item.file_name
        };
      });

      setTranscriptions(formattedTranscriptions);
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
      toast({
        title: "Error loading transcriptions",
        description: "Could not load your previous transcriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewTranscription = (data: Partial<TranscriptionData>) => {
    const newTranscription: TranscriptionData = {
      id: data.id || Date.now().toString(),
      transcript: data.transcript || '',
      timestamp: data.timestamp || new Date().toISOString(),
      anomalies: data.anomalies || [],
      suggestions: data.suggestions || [],
      duration: data.duration || 0,
      status: data.status || 'processing',
      analysis: data.analysis,
      audioUrl: data.audioUrl,
      fileName: data.fileName
    };
    
    // Update existing transcription or add new one
    setTranscriptions(prev => {
      const existingIndex = prev.findIndex(t => t.id === newTranscription.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newTranscription;
        return updated;
      }
      return [newTranscription, ...prev];
    });
    
    setActiveTranscription(newTranscription);
  };

  const updateTranscription = (id: string, updates: Partial<TranscriptionData>) => {
    setTranscriptions(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
    
    if (activeTranscription?.id === id) {
      setActiveTranscription(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          <TabsTrigger value="live">Live Recording</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Audio File</CardTitle>
              <CardDescription>
                Upload an audio file to transcribe and analyze for anomalies and suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioUploader onTranscriptionStart={handleNewTranscription} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="live" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Recording</CardTitle>
              <CardDescription>
                Record audio in real-time and get instant transcription with analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LiveRecorder onTranscriptionUpdate={handleNewTranscription} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <CallHistory 
            transcriptions={transcriptions}
            onSelectTranscription={setActiveTranscription}
          />
        </TabsContent>
      </Tabs>
      
      {activeTranscription && (
        <>
          {activeTranscription.analysis ? (
            <ComprehensiveCallAnalysis 
              transcription={activeTranscription}
              onUpdate={(updates) => updateTranscription(activeTranscription.id, updates)}
            />
          ) : (
            <TranscriptionResults 
              transcription={activeTranscription}
              onUpdate={(updates) => updateTranscription(activeTranscription.id, updates)}
            />
          )}
        </>
      )}
    </div>
  );
};