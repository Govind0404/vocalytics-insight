import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download, AlertTriangle, Lightbulb, Clock } from "lucide-react";
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

  // Dynamic role identification based on analysis
  const identifyRoles = () => {
    if (!transcription.analysis) return null;
    
    // Analyze the suggestions and anomalies to determine who is the agent
    // Suggestions are typically for agents, and receiver positive behaviors often indicate agent skills
    const receiverHasAgentSkills = transcription.analysis.anomalies.receiver.positive.some(positive => 
      positive.toLowerCase().includes('professional') || 
      positive.toLowerCase().includes('helpful') ||
      positive.toLowerCase().includes('explained') ||
      positive.toLowerCase().includes('guided') ||
      positive.toLowerCase().includes('addressed')
    );
    
    const callerHasAgentSkills = transcription.analysis.anomalies.caller.positive.some(positive => 
      positive.toLowerCase().includes('professional') || 
      positive.toLowerCase().includes('helpful') ||
      positive.toLowerCase().includes('explained') ||
      positive.toLowerCase().includes('guided') ||
      positive.toLowerCase().includes('addressed')
    );
    
    // If suggestions exist (they're for agents), and receiver shows agent skills, receiver is likely agent
    if (transcription.suggestions.length > 0 && receiverHasAgentSkills && !callerHasAgentSkills) {
      return { agentRole: 'Receiver', customerRole: 'Caller' };
    }
    
    // If caller shows more agent skills, caller is likely agent
    if (callerHasAgentSkills && !receiverHasAgentSkills) {
      return { agentRole: 'Caller', customerRole: 'Receiver' };
    }
    
    // Default fallback: assume receiver is agent (common in business calls)
    return { agentRole: 'Receiver', customerRole: 'Caller' };
  };

  const roles = identifyRoles();

  const getSpeakerLabel = (speaker: 'Caller' | 'Receiver') => {
    if (!roles) return speaker;
    return speaker === roles.agentRole ? 'Agent' : 'Customer';
  };

  const getSpeakerVariant = (speaker: 'Caller' | 'Receiver') => {
    if (!roles) return 'default';
    return speaker === roles.agentRole ? 'default' : 'secondary';
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
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Call Transcript</CardTitle>
          <CardDescription>
            Full transcription with dynamic speaker identification (Agent and Customer roles)
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
              {transcription.analysis?.transcript && transcription.analysis.transcript.length > 0 ? (
                <div className="space-y-3">
                  {transcription.analysis.transcript.map((segment, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Badge variant={getSpeakerVariant(segment.speaker)}>
                          [{getSpeakerLabel(segment.speaker)}]
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">{segment.timestamp}</span>
                      </div>
                      <p className="text-sm leading-relaxed flex-1">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription.transcript || 'No transcript available'}
                </p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      <div className="space-y-6">
        {/* Customer Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Customer Analysis
              <Badge variant="secondary">Customer</Badge>
            </CardTitle>
            <CardDescription>
              Analysis of customer behavior and communication patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Customer Positive Anomalies */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Positive Behaviors ({roles?.customerRole === 'Caller' ? 
                    transcription.analysis?.anomalies.caller.positive.length || 0 : 
                    transcription.analysis?.anomalies.receiver.positive.length || 0})
                </h4>
                {(roles?.customerRole === 'Caller' ? 
                  transcription.analysis?.anomalies.caller.positive : 
                  transcription.analysis?.anomalies.receiver.positive)?.length ? (
                  <div className="space-y-2">
                    {(roles?.customerRole === 'Caller' ? 
                      transcription.analysis.anomalies.caller.positive : 
                      transcription.analysis.anomalies.receiver.positive).map((positive, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-xs text-green-700">{positive}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No positive behaviors identified</p>
                )}
              </div>

              {/* Customer Negative Anomalies */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Areas for Concern ({roles?.customerRole === 'Caller' ? 
                    transcription.analysis?.anomalies.caller.negative.length || 0 : 
                    transcription.analysis?.anomalies.receiver.negative.length || 0})
                </h4>
                {(roles?.customerRole === 'Caller' ? 
                  transcription.analysis?.anomalies.caller.negative : 
                  transcription.analysis?.anomalies.receiver.negative)?.length ? (
                  <div className="space-y-2">
                    {(roles?.customerRole === 'Caller' ? 
                      transcription.analysis.anomalies.caller.negative : 
                      transcription.analysis.anomalies.receiver.negative).map((negative, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-xs text-red-700">{negative}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No concerning behaviors identified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Agent Analysis
              <Badge variant="default">Agent</Badge>
            </CardTitle>
            <CardDescription>
              Analysis of agent performance and communication effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Agent Positive Anomalies */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Strengths ({roles?.agentRole === 'Receiver' ? 
                    transcription.analysis?.anomalies.receiver.positive.length || 0 : 
                    transcription.analysis?.anomalies.caller.positive.length || 0})
                </h4>
                {(roles?.agentRole === 'Receiver' ? 
                  transcription.analysis?.anomalies.receiver.positive : 
                  transcription.analysis?.anomalies.caller.positive)?.length ? (
                  <div className="space-y-2">
                    {(roles?.agentRole === 'Receiver' ? 
                      transcription.analysis.anomalies.receiver.positive : 
                      transcription.analysis.anomalies.caller.positive).map((positive, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-xs text-green-700">{positive}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No strengths identified</p>
                )}
              </div>

              {/* Agent Negative Anomalies */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  Improvement Areas ({roles?.agentRole === 'Receiver' ? 
                    transcription.analysis?.anomalies.receiver.negative.length || 0 : 
                    transcription.analysis?.anomalies.caller.negative.length || 0})
                </h4>
                {(roles?.agentRole === 'Receiver' ? 
                  transcription.analysis?.anomalies.receiver.negative : 
                  transcription.analysis?.anomalies.caller.negative)?.length ? (
                  <div className="space-y-2">
                    {(roles?.agentRole === 'Receiver' ? 
                      transcription.analysis.anomalies.receiver.negative : 
                      transcription.analysis.anomalies.caller.negative).map((negative, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-xs text-red-700">{negative}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No improvement areas identified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Suggestions Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Lightbulb className="w-5 h-5" />
              Agent Improvement Suggestions ({transcription.suggestions.length})
            </CardTitle>
            <CardDescription>
              Personalized recommendations to enhance agent performance and customer interaction skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transcription.suggestions.length > 0 ? (
              <div className="space-y-3">
                {transcription.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm">
                      <span className="font-medium text-blue-600">Suggestion: </span>
                      {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No suggestions available for the agent</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};