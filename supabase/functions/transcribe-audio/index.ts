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
    formData.append('temperature', '0'); // Make transcription more literal
    // Do not set language, let Whisper auto-detect (supports English, Hindi, Tamil)
    formData.append('prompt', 'Transcribe accurately. Audio may contain English, Hindi, Tamil, or a mix. For introductions, prefer "This is" if context matches.');

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

    // Enhanced call analysis with improved scoring precision
    const comprehensiveAnalysisPrompt = `
You are an expert call analysis AI specializing in customer service, sales, and consultation calls. Analyze the following call transcript and provide a comprehensive report with speaker diarization, anomaly detection, and highly precise scoring.

TRANSCRIPT: "${transcript}"
CALL DURATION: ${duration} seconds

Return your analysis as a single-line valid JSON object with the following fields:
- objective: string (brief description of the main purpose/objective of the call)
- transcript: array of { speaker: "Caller" or "Receiver", text: string, timestamp: string }
- anomalies: { caller: { positive: string[], negative: string[] }, receiver: { positive: string[], negative: string[] } }
- conclusion: string (summary of who initiated the call, what was discussed, and the outcome)
- suggestions: string[] (actionable suggestions specifically for the Caller)
- score: number (a floating-point value between 0.0 and 10.0 with 0.1 precision, calculated based on the actual transcript and analysis)
- scoreReasoning: string (detailed explanation of the score with specific factors, improvements, and breakdown)

ENHANCED ANALYSIS GUIDELINES:

1. SPEAKER DIARIZATION: Intelligently identify and separate speakers as "Caller" and "Receiver" based on context clues, initiation patterns, and conversation flow

2. CALL TYPE DETECTION: Automatically detect call type based on content:
   - Sales calls: Product mentions, pricing discussions, closing attempts
   - Support calls: Problem descriptions, troubleshooting, resolution
   - Consultation calls: Advice seeking, expert guidance, planning
   - Inquiry calls: Information gathering, questions, research
   - Complaint calls: Issues, dissatisfaction, escalation
   - Follow-up calls: Previous interaction references, status updates

3. PRECISE SCORING CRITERIA (0.0-10.0 with 0.1 precision):

   COMMUNICATION EXCELLENCE (2.5 points):
   - Clarity and articulation (0.5 points)
   - Professional tone and courtesy (0.5 points)
   - Language proficiency and fluency (0.5 points)
   - Voice modulation and pace (0.5 points)
   - Active listening and responsiveness (0.5 points)

   OBJECTIVE ACHIEVEMENT (2.0 points):
   - Call purpose identification (0.3 points)
   - Goal accomplishment (0.7 points)
   - Problem resolution effectiveness (0.5 points)
   - Outcome quality and satisfaction (0.5 points)

   ENGAGEMENT AND INTERACTION (1.5 points):
   - Conversation flow and structure (0.5 points)
   - Question quality and relevance (0.4 points)
   - Response appropriateness (0.3 points)
   - Engagement maintenance (0.3 points)

   ANOMALY IMPACT ASSESSMENT (1.5 points):
   - Positive behavior impact (0.8 points)
   - Negative behavior mitigation (0.7 points)
   - Weight anomalies by impact: Critical (1.0), Moderate (0.6), Minor (0.3)

   CONTEXT-AWARE FACTORS (1.5 points):
   - Call type appropriateness (0.3 points)
   - Duration optimization (0.3 points)
   - Industry-specific considerations (0.3 points)
   - Language complexity handling (0.3 points)
   - Cultural sensitivity (0.3 points)

   TECHNICAL EXCELLENCE (1.0 points):
   - Call structure and organization (0.4 points)
   - Time management (0.3 points)
   - Follow-up planning (0.3 points)

4. SCORING PRECISION REQUIREMENTS:
   - Use 0.1 precision for scores (e.g., 7.3, 8.7, 9.1, NOT 8.5)
   - Avoid defaulting to middle-range scores
   - Calculate based on actual transcript analysis, not examples
   - Consider call duration impact on scoring
   - Weight anomalies by their actual impact on call outcome

5. CONTEXT-SPECIFIC ADJUSTMENTS:
   - Sales calls: Emphasize closing effectiveness, objection handling
   - Support calls: Focus on problem resolution, customer satisfaction
   - Consultation calls: Value delivery, expertise demonstration
   - Multi-language calls: Language proficiency, cultural awareness

6. DURATION OPTIMIZATION:
   - Short calls (<2 min): Efficiency and directness
   - Medium calls (2-10 min): Balance of detail and efficiency
   - Long calls (>10 min): Comprehensive coverage and engagement

7. LANGUAGE SUPPORT: Enhanced handling of Hindi-English code-mixed conversations with cultural context

8. DETAILED REASONING REQUIREMENT: Provide comprehensive scoreReasoning that includes:
   - Specific scoring breakdown by category
   - Key strengths and weaknesses identified
   - Impact of anomalies on final score
   - Context-specific factors considered
   - Specific improvement recommendations

IMPORTANT: 
- Calculate score based on actual transcript analysis, not example values
- Use 0.1 precision for scores (e.g., 7.3, 8.7, 9.1)
- Provide detailed scoreReasoning with specific factors and improvements
- Return only the JSON object, no markdown or extra text
- Ensure timestamps are estimated based on conversation flow
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
      
      // Log the parsed score for debugging
      console.log('Parsed score:', analysis.score, 'Reasoning:', analysis.scoreReasoning);
      
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