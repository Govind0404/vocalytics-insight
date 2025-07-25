import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptionRequest {
  audio: string; // base64 encoded audio
  fileName: string;
  fileType: string;
}

interface SpeakerSegment {
  speaker: 'Caller' | 'Receiver';
  text: string;
  timestamp: string;
}

interface CallAnalysis {
  objective: string;
  transcript: SpeakerSegment[];
  anomalies: {
    caller: string[];
    receiver: string[];
  };
  conclusion: string;
  suggestions: string[];
  score: number;
  scoreReasoning: string;
}

interface TranscriptionResponse {
  transcript: string;
  anomalies: string[];
  suggestions: string[];
  duration: number;
  analysis: CallAnalysis;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, fileName, fileType }: TranscriptionRequest = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`Processing audio file: ${fileName} (${fileType})`);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert base64 to blob for OpenAI API
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryAudio], { type: fileType });

    // Prepare form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    console.log('Sending audio to OpenAI Whisper API...');

    // Call OpenAI Whisper API for transcription
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI Whisper API error:', errorText);
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcript = whisperResult.text;
    const duration = whisperResult.duration || 0;

    console.log('Transcription completed, performing comprehensive call analysis...');

    // Comprehensive call analysis using advanced prompting
    const comprehensiveAnalysisPrompt = `
You are an expert call analysis AI specializing in customer service and sales calls. Analyze the following call transcript and provide a comprehensive report with speaker diarization, anomaly detection, and scoring.

TRANSCRIPT: "${transcript}"

Provide your analysis in the following JSON format:

{
  "objective": "Brief description of the main purpose/objective of the call (e.g., Sales Inquiry, Product Demo, Complaint Handling, Lead Qualification, Order Confirmation, Post-Sales Support)",
  "transcript": [
    {
      "speaker": "Caller" or "Receiver",
      "text": "What was said",
      "timestamp": "00:00"
    }
  ],
  "anomalies": {
    "caller": ["List of anomalies for the caller"],
    "receiver": ["List of anomalies for the receiver"]
  },
  "conclusion": "Natural language summary of who initiated the call, what was discussed, and the outcome",
  "suggestions": ["Actionable suggestions specifically for the Caller"],
  "score": 8.5,
  "scoreReasoning": "Explanation of the score based on communication clarity, objective fulfillment, anomalies, engagement, tone, and outcome"
}

ANALYSIS GUIDELINES:
1. SPEAKER DIARIZATION: Intelligently identify and separate speakers as "Caller" and "Receiver" based on context clues like who initiates, asks questions, or provides information
2. OBJECTIVE DETECTION: Determine the main purpose from conversation content and flow
3. ANOMALY DETECTION: Look for:
   - Long silences or no response
   - Overlapping speech patterns
   - Frequent interruptions
   - Aggressive tone or inappropriate language
   - Background noise indicators
   - Unclear communication
4. SCORING CRITERIA (0-10):
   - Communication clarity (2 points)
   - Objective achievement (2 points) 
   - Professional tone (2 points)
   - Engagement level (2 points)
   - Few anomalies (2 points)
5. LANGUAGE SUPPORT: Handle Hindi-English code-mixed conversations appropriately
6. SUGGESTIONS: Focus only on caller improvement areas

Ensure timestamps are estimated based on conversation flow if not available in the original transcript.
`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional call analysis expert specializing in comprehensive call evaluation with speaker diarization. Always respond with valid JSON that matches the exact format requested.' },
          { role: 'user', content: comprehensiveAnalysisPrompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!analysisResponse.ok) {
      console.error('Analysis API error:', await analysisResponse.text());
      throw new Error(`Analysis API error: ${analysisResponse.status}`);
    }

    let analysis: CallAnalysis;
    let anomalies: string[] = [];
    let suggestions: string[] = [];

    try {
      const analysisResult = await analysisResponse.json();
      const analysisContent = analysisResult.choices[0]?.message?.content;
      
      console.log('Raw analysis response:', analysisContent);
      
      analysis = JSON.parse(analysisContent);
      
      // Extract legacy format for backward compatibility
      anomalies = [...(analysis.anomalies.caller || []), ...(analysis.anomalies.receiver || [])];
      suggestions = analysis.suggestions || [];
      
    } catch (parseError) {
      console.error('Failed to parse comprehensive analysis JSON:', parseError);
      
      // Fallback analysis
      analysis = {
        objective: "Unable to determine call objective",
        transcript: [{
          speaker: "System" as 'Caller' | 'Receiver',
          text: transcript.substring(0, 500) + "...",
          timestamp: "00:00"
        }],
        anomalies: {
          caller: ["Analysis error - manual review required"],
          receiver: ["Analysis error - manual review required"]
        },
        conclusion: "Call analysis could not be completed due to processing error",
        suggestions: ["Manual review of call recording recommended"],
        score: 5.0,
        scoreReasoning: "Score not available due to analysis error"
      };
      
      anomalies = ["Analysis processing error"];
      suggestions = ["Manual review recommended"];
    }

    console.log('Comprehensive analysis completed successfully');

    const response: TranscriptionResponse = {
      transcript,
      anomalies,
      suggestions,
      duration: Math.round(duration),
      analysis,
    };

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || String(error),
        stack: error.stack || null,
        transcript: 'Error during transcription',
        anomalies: [],
        suggestions: [],
        duration: 0,
        analysis: {
          objective: "Error during analysis",
          transcript: [],
          anomalies: { caller: [], receiver: [] },
          conclusion: "Call analysis failed",
          suggestions: [],
          score: 0,
          scoreReasoning: "Analysis could not be completed due to error"
        }
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});