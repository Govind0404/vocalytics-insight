import { CallTranscriptionDashboard } from "@/components/CallTranscriptionDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8 relative">
          {/* Theme Toggle positioned in top-right */}
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            Call Transcription & Analysis
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive AI-powered call analysis with speaker diarization, anomaly detection, and quality scoring
          </p>
        </header>
        
        <div className="max-w-6xl mx-auto">
          <CallTranscriptionDashboard />
        </div>
      </div>
    </div>
  );
};

export default Index;
