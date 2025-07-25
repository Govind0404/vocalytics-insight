export interface SpeakerSegment {
  speaker: 'Caller' | 'Receiver';
  text: string;
  timestamp: string;
}

export interface CallAnalysis {
  objective: string;
  transcript: SpeakerSegment[];
  anomalies: {
    caller: {
      positive: string[];
      negative: string[];
    };
    receiver: {
      positive: string[];
      negative: string[];
    };
  };
  conclusion: string;
  suggestions: string[];
  score: number;
  scoreReasoning: string;
}

export interface TranscriptionData {
  id: string;
  transcript: string;
  timestamp: string;
  anomalies: string[];
  suggestions: string[];
  duration: number;
  status: 'processing' | 'completed' | 'error';
  analysis?: CallAnalysis;
  audioUrl?: string;
  fileName?: string;
}

export interface TranscriptionResponse {
  transcript: string;
  anomalies: string[];
  suggestions: string[];
  duration: number;
  analysis: CallAnalysis;
}