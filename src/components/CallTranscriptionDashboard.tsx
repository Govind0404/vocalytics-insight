import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioUploader } from "./AudioUploader";
import { LiveRecorder } from "./LiveRecorder";
import { TranscriptionResults } from "./TranscriptionResults";
import { ComprehensiveCallAnalysis } from "./ComprehensiveCallAnalysis";
import { CallHistory } from "./CallHistory";
import { TranscriptionData } from "@/types/transcription";

export const CallTranscriptionDashboard = () => {
  const [transcriptions, setTranscriptions] = useState<TranscriptionData[]>([]);
  const [activeTranscription, setActiveTranscription] = useState<TranscriptionData | null>(null);

  const handleNewTranscription = (data: Partial<TranscriptionData>) => {
    const newTranscription: TranscriptionData = {
      id: Date.now().toString(),
      transcript: data.transcript || '',
      timestamp: new Date().toISOString(),
      anomalies: data.anomalies || [],
      suggestions: data.suggestions || [],
      duration: data.duration || 0,
      status: data.status || 'processing',
      analysis: data.analysis
    };
    
    setTranscriptions(prev => [newTranscription, ...prev]);
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