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

interface TranscriptionResponse {
  transcript: string;
  anomalies: string[];
  suggestions: string[];
  duration: number;
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

    console.log('Transcription completed, analyzing for anomalies and suggestions...');

    // Analyze transcript for anomalies and suggestions using GPT
    const analysisPrompt = `
You are an expert call analyzer. Analyze the following call transcript and provide:

1. ANOMALIES: Identify any unusual patterns, suspicious behaviors, compliance issues, or concerning elements
2. SUGGESTIONS: Provide actionable recommendations for improvement

Transcript: "${transcript}"

Respond in JSON format:
{
  "anomalies": ["anomaly1", "anomaly2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
}

Focus on:
- Speech patterns (too fast, unclear, interruptions)
- Emotional indicators (stress, anger, confusion)
- Compliance issues (missing disclosures, inappropriate language)
- Communication quality (unclear explanations, missed opportunities)
- Professional conduct issues
`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a professional call analysis expert. Always respond with valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!analysisResponse.ok) {
      console.error('Analysis API error:', await analysisResponse.text());
      // Continue without analysis rather than failing completely
    }

    let anomalies: string[] = [];
    let suggestions: string[] = [];

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      const analysisContent = analysisResult.choices[0]?.message?.content;
      
      try {
        const analysis = JSON.parse(analysisContent);
        anomalies = analysis.anomalies || [];
        suggestions = analysis.suggestions || [];
      } catch (parseError) {
        console.error('Failed to parse analysis JSON:', parseError);
        // Provide fallback analysis
        if (transcript.length > 0) {
          suggestions.push("Consider reviewing the call for clarity and completeness");
          if (transcript.split(' ').length > 500) {
            anomalies.push("Call duration may be longer than typical");
          }
        }
      }
    }

    console.log('Analysis completed successfully');

    const response: TranscriptionResponse = {
      transcript,
      anomalies,
      suggestions,
      duration: Math.round(duration),
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
        error: error.message,
        transcript: 'Error during transcription',
        anomalies: [],
        suggestions: [],
        duration: 0
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