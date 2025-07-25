import React from 'react';
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
  Star
} from 'lucide-react';

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

interface TranscriptionData {
  transcript: string;
  timestamp: string;
  anomalies: string[];
  suggestions: string[];
  duration: number;
  status: 'processing' | 'completed' | 'error';
  analysis?: CallAnalysis;
}

interface ComprehensiveCallAnalysisProps {
  transcription: TranscriptionData;
  onUpdate: (updates: Partial<TranscriptionData>) => void;
}

export const ComprehensiveCallAnalysis: React.FC<ComprehensiveCallAnalysisProps> = ({ 
  transcription, 
  onUpdate 
}) => {
  const { toast } = useToast();

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

CALLER ANOMALIES:
${analysis.anomalies.caller.map(anomaly => `• ${anomaly}`).join('\n')}

RECEIVER ANOMALIES:
${analysis.anomalies.receiver.map(anomaly => `• ${anomaly}`).join('\n')}

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

      {/* Call Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Call Quality Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score}/10
              </div>
              <Badge variant={analysis.score >= 8 ? "default" : analysis.score >= 6 ? "secondary" : "destructive"}>
                {analysis.score >= 8 ? "Excellent" : analysis.score >= 6 ? "Good" : "Needs Improvement"}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.scoreReasoning}</p>
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
                    {segment.speaker === 'Caller' ? (
                      <User className="h-4 w-4 text-blue-500" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    )}
                    <Badge variant={segment.speaker === 'Caller' ? "outline" : "secondary"}>
                      {segment.speaker}
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

      {/* Anomalies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              <span>Caller Anomalies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.anomalies.caller.length > 0 ? (
              <ul className="space-y-2">
                {analysis.anomalies.caller.map((anomaly, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{anomaly}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No anomalies detected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-green-500" />
              <span>Receiver Anomalies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.anomalies.receiver.length > 0 ? (
              <ul className="space-y-2">
                {analysis.anomalies.receiver.map((anomaly, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{anomaly}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No anomalies detected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Conclusion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Call Conclusion</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.conclusion}</p>
        </CardContent>
      </Card>

      {/* Suggestions for Caller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Suggestions for Caller</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.suggestions.length > 0 ? (
            <ul className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific suggestions available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};