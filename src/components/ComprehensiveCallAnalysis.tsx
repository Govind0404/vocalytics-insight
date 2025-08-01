import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Copy, 
  Target, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  User,
  UserCheck,
  Clock,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TranscriptionData } from '@/types/transcription';

interface ComprehensiveCallAnalysisProps {
  transcription: TranscriptionData;
  onUpdate: (updates: Partial<TranscriptionData>) => void;
}

export const ComprehensiveCallAnalysis: React.FC<ComprehensiveCallAnalysisProps> = ({ 
  transcription, 
  onUpdate 
}) => {
  const { toast } = useToast();

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

  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const getSpeakerVariant = (speaker: 'Caller' | 'Receiver') => {
    if (!roles) return 'outline';
    return speaker === roles.agentRole ? 'secondary' : 'outline';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy content to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadFullReport = () => {
    if (!transcription.analysis) return;

    const analysis = transcription.analysis;
    const reportContent = `
COMPREHENSIVE CALL ANALYSIS REPORT
Generated on: ${new Date().toLocaleString()}
Duration: ${Math.floor(transcription.duration / 60)}m ${transcription.duration % 60}s

=================================
CALL OBJECTIVE
=================================
${analysis.objective}

=================================
SPEAKER-AWARE TRANSCRIPT
=================================
${analysis.transcript.map(segment => 
  `[${segment.timestamp}] ${segment.speaker}: ${segment.text}`
).join('\n')}

=================================
DETECTED ANOMALIES
=================================

CALLER POSITIVE BEHAVIORS:
${analysis.anomalies.caller.positive.map(anomaly => `• ${anomaly}`).join('\n')}

CALLER NEGATIVE BEHAVIORS:
${analysis.anomalies.caller.negative.map(anomaly => `• ${anomaly}`).join('\n')}

RECEIVER POSITIVE BEHAVIORS:
${analysis.anomalies.receiver.positive.map(anomaly => `• ${anomaly}`).join('\n')}

RECEIVER NEGATIVE BEHAVIORS:
${analysis.anomalies.receiver.negative.map(anomaly => `• ${anomaly}`).join('\n')}

=================================
CALL CONCLUSION
=================================
${analysis.conclusion}

=================================
SUGGESTIONS FOR CALLER
=================================
${analysis.suggestions.map(suggestion => `• ${suggestion}`).join('\n')}

=================================
CALL QUALITY SCORE
=================================
Score: ${analysis.score}/10
Reasoning: ${analysis.scoreReasoning}

=================================
Raw Transcript:
${transcription.transcript}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-analysis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report downloaded",
      description: "Full call analysis report has been downloaded",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getObjectiveIcon = (objective: string) => {
    const lowerObjective = objective.toLowerCase();
    if (lowerObjective.includes('sales') || lowerObjective.includes('demo')) 
      return <TrendingUp className="h-5 w-5" />;
    if (lowerObjective.includes('support') || lowerObjective.includes('complaint')) 
      return <CheckCircle className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  if (!transcription.analysis) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No comprehensive analysis available</p>
        </CardContent>
      </Card>
    );
  }

  const analysis = transcription.analysis;

  return (
    <div className="space-y-6">
      {/* Header with Call Objective and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getObjectiveIcon(analysis.objective)}
              <div>
                <CardTitle className="text-xl">Call Analysis Report</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(transcription.timestamp).toLocaleString()} • {Math.floor(transcription.duration / 60)}m {transcription.duration % 60}s
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(analysis.objective)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadFullReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Call Objective</h3>
              <p className="text-sm text-muted-foreground">{analysis.objective}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speaker-Aware Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Speaker-Aware Transcript</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-3">
              {analysis.transcript.map((segment, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex items-center space-x-2 min-w-[120px]">
                    {getSpeakerLabel(segment.speaker) === 'Agent' ? (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500" />
                    )}
                    <Badge variant={getSpeakerVariant(segment.speaker)}>
                      {getSpeakerLabel(segment.speaker)}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{segment.timestamp}</span>
                    </div>
                    <p className="text-sm">{segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Audio Player */}
      {transcription.audioUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Audio Recording</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <audio controls className="w-full">
                <source src={transcription.audioUrl} type="audio/mpeg" />
                <source src={transcription.audioUrl} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = transcription.audioUrl!;
                    a.download = transcription.fileName || 'recording.mp3';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Audio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caller and Receiver Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caller Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-500" />
              <span>Customer Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Positive Behaviors
              </h4>
              {analysis.anomalies.caller.positive.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.anomalies.caller.positive.map((positive, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{positive}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No positive behaviors identified</p>
              )}
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-red-600 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Areas for Improvement
              </h4>
              {analysis.anomalies.caller.negative.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.anomalies.caller.negative.map((negative, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{negative}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No issues identified</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receiver Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <span>Agent Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Positive Behaviors
              </h4>
              {analysis.anomalies.receiver.positive.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.anomalies.receiver.positive.map((positive, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{positive}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No positive behaviors identified</p>
              )}
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-red-600 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Areas for Improvement
              </h4>
              {analysis.anomalies.receiver.negative.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.anomalies.receiver.negative.map((negative, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm">{negative}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No issues identified</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Call Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.conclusion}</p>
        </CardContent>
      </Card>

      {/* Enhanced Call Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Call Quality Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score.toFixed(1)}/10
              </div>
              <Badge variant={analysis.score >= 8 ? "default" : analysis.score >= 6 ? "secondary" : "destructive"}>
                {analysis.score >= 8 ? "Excellent" : analysis.score >= 6 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            >
              {showDetailedAnalysis ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>
          </div>

          {showDetailedAnalysis && (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <h5 className="font-medium text-sm mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Detailed Score Analysis
                </h5>
                <div className="space-y-3">
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    {analysis.scoreReasoning.split('.').map((sentence, index) => (
                      sentence.trim() && (
                        <p key={index} className="mb-2">
                          {sentence.trim()}.
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </div>

              {/* Score Insights */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                  <h6 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Key Strengths</h6>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    {(roles?.agentRole === 'Receiver' ? 
                      analysis.anomalies.receiver.positive : 
                      analysis.anomalies.caller.positive).slice(0, 3).map((positive, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        {positive}
                      </li>
                    ))}
                    {(roles?.agentRole === 'Receiver' ? 
                      analysis.anomalies.receiver.positive : 
                      analysis.anomalies.caller.positive).length === 0 && (
                      <li className="text-muted-foreground">No specific strengths identified</li>
                    )}
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3">
                  <h6 className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2">Areas for Improvement</h6>
                  <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-1">
                    {(roles?.agentRole === 'Receiver' ? 
                      analysis.anomalies.receiver.negative : 
                      analysis.anomalies.caller.negative).slice(0, 3).map((negative, index) => (
                      <li key={index} className="flex items-start">
                        <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                        {negative}
                      </li>
                    ))}
                    {(roles?.agentRole === 'Receiver' ? 
                      analysis.anomalies.receiver.negative : 
                      analysis.anomalies.caller.negative).length === 0 && (
                      <li className="text-muted-foreground">No specific issues identified</li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Agent Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Agent Improvement Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.suggestions.length > 0 ? (
            <ul className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-primary">Recommendation {index + 1}: </span>
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No suggestions available for the agent</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};