import { CallTranscriptionDashboard } from "@/components/CallTranscriptionDashboard";

const Index = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
          AI-Powered Call Analysis
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Comprehensive call transcription with speaker diarization, anomaly detection, and quality scoring. 
          Supports English, Hindi, and Tamil languages.
        </p>
      </div>
      
      <CallTranscriptionDashboard />
    </div>
  );
};

export default Index;
