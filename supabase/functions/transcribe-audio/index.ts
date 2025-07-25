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
You are an expert call analysis AI specializing in customer service and sales calls. Analyze the following call transcript and provide a comprehensive report with speaker diarization, positive/negative anomaly detection, and enhanced scoring.

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
    "caller": {
      "positive": ["List of positive behaviors/strengths for the caller"],
      "negative": ["List of negative behaviors/issues for the caller"]
    },
    "receiver": {
      "positive": ["List of positive behaviors/strengths for the receiver"],
      "negative": ["List of negative behaviors/issues for the receiver"]
    }
  },
  "conclusion": "Natural language summary of who initiated the call, what was discussed, and the outcome",
  "suggestions": ["Actionable suggestions specifically for the Caller"],
  "score": 8.5,
  "scoreReasoning": "Comprehensive explanation of the score based on communication clarity, objective fulfillment, positive/negative anomalies, engagement, tone, conclusion quality, and overall call effectiveness"
}

ANALYSIS GUIDELINES:
1. SPEAKER DIARIZATION: Intelligently identify and separate speakers as "Caller" and "Receiver" based on context clues like who initiates, asks questions, or provides information

2. OBJECTIVE DETECTION: Determine the main purpose from conversation content and flow

3. POSITIVE ANOMALY DETECTION: Identify strengths and positive behaviors:
   - Clear communication and articulation
   - Active listening and engagement
   - Professional tone and courtesy
   - Effective questioning techniques
   - Problem-solving approach
   - Empathy and understanding
   - Proper call flow management
   - Building rapport

4. NEGATIVE ANOMALY DETECTION: Identify issues and areas for improvement:
   - Long silences or no response
   - Overlapping speech patterns
   - Frequent interruptions
   - Aggressive or inappropriate tone
   - Background noise indicators
   - Unclear communication
   - Missed opportunities
   - Poor listening skills

5. ENHANCED SCORING CRITERIA (0-10):
   - Communication clarity and articulation (1.5 points)
   - Objective achievement and call resolution (2 points)
   - Professional tone and courtesy (1.5 points)
   - Engagement level and active listening (1.5 points)
   - Positive vs negative anomaly ratio (1.5 points)
   - Call structure and flow management (1 point)
   - Problem-solving effectiveness (1 point)
   - Overall call quality and outcome (1 point)

6. LANGUAGE SUPPORT: Handle Hindi-English code-mixed conversations appropriately

7. SUGGESTIONS: Focus on actionable improvement areas for the caller based on identified negative anomalies and missed positive opportunities

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
      let analysisContent = analysisResult.choices[0]?.message?.content;
      
      console.log('Raw analysis response:', analysisContent);
      
      // Remove markdown code block formatting if present
      if (analysisContent.includes('```json')) {
        analysisContent = analysisContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (analysisContent.includes('```')) {
        analysisContent = analysisContent.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      analysis = JSON.parse(analysisContent.trim());
      
      // Extract legacy format for backward compatibility
      anomalies = [
        ...(analysis.anomalies.caller?.positive || []),
        ...(analysis.anomalies.caller?.negative || []),
        ...(analysis.anomalies.receiver?.positive || []),
        ...(analysis.anomalies.receiver?.negative || [])
      ];
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
          caller: {
            positive: [],
            negative: ["Analysis error - manual review required"]
          },
          receiver: {
            positive: [],
            negative: ["Analysis error - manual review required"]
          }
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
          anomalies: { 
            caller: { positive: [], negative: [] },
            receiver: { positive: [], negative: [] }
          },
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