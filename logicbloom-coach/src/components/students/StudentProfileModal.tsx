import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  email?: string;
  student_identifier?: string;
  cognitive_health_score?: number;
  weak_spots?: string[];
  notes?: string;
  status?: string;
}

interface StudentProfileModalProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StudentProfileModal = ({ student, open, onOpenChange }: StudentProfileModalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [parentReport, setParentReport] = useState<string | null>(null);

  const { data: analysisHistory } = useQuery({
    queryKey: ['student-analyses', student?.id],
    queryFn: async () => {
      if (!student) return [];
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: open && !!student,
  });

  // Early return if no student - must be after all hooks
  if (!student) {
    return null;
  }

  const healthColor = student.cognitive_health_score
    ? student.cognitive_health_score >= 80
      ? 'text-success'
      : student.cognitive_health_score >= 60
      ? 'text-warning'
      : 'text-destructive'
    : 'text-muted-foreground';

  const handleGenerateParentReport = async () => {
    setIsGeneratingReport(true);
    setParentReport(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-parent-report', {
        body: { 
          studentId: student.id,
          studentName: student.name,
          cognitiveHealthScore: student.cognitive_health_score,
          weakSpots: student.weak_spots,
          analysisCount: analysisHistory?.length || 0,
        }
      });

      if (error) throw error;
      setParentReport(data.report);
      toast.success('Parent report generated!');
    } catch (err: any) {
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const verdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'correct':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-gradient sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            {student.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cognitive Health</p>
                      <p className={cn('text-2xl font-bold', healthColor)}>
                        {student.cognitive_health_score ?? 'N/A'}%
                      </p>
                    </div>
                    <TrendingUp className={cn('w-8 h-8', healthColor)} />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Analyses</p>
                      <p className="text-2xl font-bold text-foreground">
                        {analysisHistory?.length ?? 0}
                      </p>
                    </div>
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generate Parent Report Button */}
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Parent Report</p>
                    <p className="text-sm text-muted-foreground">Generate a summary for parents</p>
                  </div>
                  <Button
                    onClick={handleGenerateParentReport}
                    disabled={isGeneratingReport}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Parent Report
                      </>
                    )}
                  </Button>
                </div>

                {/* Parent Report Display */}
                {parentReport && (
                  <div className="mt-4 p-4 rounded-lg bg-background/50 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Generated Report</span>
                    </div>
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {parentReport}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weak Spots */}
            {student.weak_spots && student.weak_spots.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Weak Spots</h4>
                <div className="flex flex-wrap gap-2">
                  {student.weak_spots.map((spot, i) => (
                    <Badge key={i} variant="outline" className="bg-warning/10 text-warning border-warning/30">
                      {spot}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {student.notes && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">{student.notes}</p>
              </div>
            )}

            {/* Recent Analyses */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Analyses</h4>
              {analysisHistory && analysisHistory.length > 0 ? (
                <div className="space-y-2">
                  {analysisHistory.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {verdictIcon(analysis.verdict)}
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {analysis.verdict.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">{analysis.subject}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                        {analysis.error_type && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {analysis.error_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 text-muted-foreground">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No analyses yet</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfileModal;
