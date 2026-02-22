import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { SocraticChat, AnalysisContext } from '@/components/chat/SocraticChat';
import {
  Upload,
  FileText,
  Image,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageCircle,
  Save,
  Lightbulb,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Target,
  ScanText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowRight,
  Edit3,
  School,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Workflow states
type WorkflowState = 'IDLE' | 'EXTRACTING' | 'VERIFYING' | 'ANALYZING' | 'RESULTS';

interface AnalysisResult {
  verdict: 'correct' | 'partial' | 'critical_error';
  summary: string;
  errorType?: string;
  cognitiveTrace: { step: number; description: string; isError: boolean }[];
  socraticQuestions: string[];
  topic?: string;
  cognitiveInsight?: {
    focusLevel: string;
    struggleTopic: string;
    insightSummary: string;
  };
}

const AnalysisStudio = () => {
  const { user } = useAuth();
  const { isStudent } = useRole();
  const location = useLocation();
  
  // Get preselected classroom from navigation state (when coming from classroom workspace)
  const preselectedClassroom = (location.state as any)?.preselectedClassroom;
  
  // Workflow state
  const [workflowState, setWorkflowState] = useState<WorkflowState>('IDLE');
  
  // Input states
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [subject, setSubject] = useState('mathematics');
  const [studentId, setStudentId] = useState<string>('none');
  const [classroomId, setClassroomId] = useState<string>(preselectedClassroom || 'none');
  
  // Verification states
  const [extractedText, setExtractedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [imageZoom, setImageZoom] = useState(100);
  
  // Result states
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update classroom selection when navigating from a specific classroom
  useEffect(() => {
    if (preselectedClassroom && preselectedClassroom !== classroomId) {
      setClassroomId(preselectedClassroom);
    }
  }, [preselectedClassroom]);

  // Fetch students for dropdown (teachers only)
  const { data: students } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !isStudent,
  });

  // Fetch classrooms for context selection (students fetch joined classes, teachers fetch their classes)
  const { data: classrooms } = useQuery({
    queryKey: ['classrooms-dropdown', user?.id, isStudent],
    queryFn: async () => {
      if (!user) return [];
      
      if (isStudent) {
        // Students: fetch joined classes
        const { data, error } = await supabase
          .from('class_members')
          .select(`
            classroom_id,
            classrooms (
              id,
              name,
              subject
            )
          `)
          .eq('student_id', user.id);
        if (error) throw error;
        return (data || []).map(m => m.classrooms).filter(Boolean);
      } else {
        // Teachers: fetch their classes
        const { data, error } = await supabase
          .from('classrooms')
          .select('id, name, subject')
          .eq('user_id', user.id);
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!user,
  });

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    setImageFile(file);
    setUploadedImageUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setInputMode('image');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-work')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('student-work')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) throw signedUrlError;
      
      const signedUrl = signedUrlData.signedUrl;
      setUploadedImageUrl(signedUrl);
      return signedUrl;
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message);
      return null;
    }
  };

  // Step 1: Extract text from image (OCR)
  const handleExtractText = async () => {
    if (!imageFile) {
      toast.error('Please select an image');
      return;
    }
    
    setWorkflowState('EXTRACTING');
    setStatus(['Uploading image...']);
    setResult(null);
    setIsSaved(false);
    setHistoryId(null);
    setFeedbackGiven(false);

    try {
      let imageUrl = uploadedImageUrl;
      
      if (!imageUrl) {
        imageUrl = await uploadImage();
        if (!imageUrl) {
          throw new Error('Failed to upload image');
        }
      }

      setStatus(prev => [...prev, 'Digitizing handwriting...']);
      
      // Use new cognitive-processor with OCR_ONLY mode
      const { data, error } = await supabase.functions.invoke('cognitive-processor', {
        body: { 
          mode: 'OCR_ONLY',
          imageUrl, 
          subject 
        }
      });

      if (error) throw error;
      
      if (!data?.extractedText) {
        throw new Error('No text extracted from image');
      }
      
      setExtractedText(data.extractedText);
      setEditedText(data.extractedText);
      setStatus(prev => [...prev, 'Extraction complete!']);
      setWorkflowState('VERIFYING');
      toast.success('Text extracted! Please verify before analysis.');
    } catch (err: any) {
      toast.error(err.message || 'Extraction failed');
      setStatus(prev => [...prev, 'Error occurred']);
      setWorkflowState('IDLE');
    }
  };

  // Step 2: Analyze the verified text
  const handleAnalyzeText = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) {
      toast.error('Please enter or verify text content');
      return;
    }
    
    setWorkflowState('ANALYZING');
    setStatus(['Receiving verified input...', 'Tracing cognitive pathway...']);

    try {
      // Use new cognitive-processor with COGNITIVE_ANALYSIS mode
      const { data, error } = await supabase.functions.invoke('cognitive-processor', {
        body: { 
          mode: 'COGNITIVE_ANALYSIS',
          content: textToAnalyze, 
          subject,
          classroomId: classroomId !== 'none' ? classroomId : undefined,
        }
      });

      if (error) throw error;
      setStatus(prev => [...prev, 'Generating Socratic questions...', 'Generating Cognitive Insight...', 'Analysis complete!']);
      setResult(data);
      setWorkflowState('RESULTS');
      
      // Log to history table
      const aiOutputText = JSON.stringify({
        verdict: data.verdict,
        summary: data.summary,
        socraticQuestions: data.socraticQuestions,
        cognitiveTrace: data.cognitiveTrace,
        cognitiveInsight: data.cognitiveInsight,
      });
      
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .insert({
          user_id: user!.id,
          image_url: uploadedImageUrl,
          ai_output: aiOutputText,
        })
        .select('id')
        .single();
      
      if (historyError) {
        console.error('Failed to log to history:', historyError);
      } else {
        setHistoryId(historyData.id);
      }
      
      toast.success('Analysis complete!');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
      setStatus(prev => [...prev, 'Error occurred']);
      setWorkflowState('VERIFYING');
    }
  };

  // Direct text analysis (no image flow)
  const handleDirectTextAnalysis = async () => {
    if (!textInput.trim()) {
      toast.error('Please enter student work');
      return;
    }
    
    setWorkflowState('ANALYZING');
    setStatus(['Receiving input...', 'Tracing cognitive pathway...']);
    setResult(null);
    setIsSaved(false);
    setHistoryId(null);
    setFeedbackGiven(false);

    try {
      // Use new cognitive-processor with COGNITIVE_ANALYSIS mode
      const { data, error } = await supabase.functions.invoke('cognitive-processor', {
        body: { 
          mode: 'COGNITIVE_ANALYSIS',
          content: textInput, 
          subject,
          classroomId: classroomId !== 'none' ? classroomId : undefined,
        }
      });

      if (error) throw error;
      setStatus(prev => [...prev, 'Generating Socratic questions...', 'Generating Cognitive Insight...', 'Analysis complete!']);
      setResult(data);
      setWorkflowState('RESULTS');
      
      const aiOutputText = JSON.stringify({
        verdict: data.verdict,
        summary: data.summary,
        socraticQuestions: data.socraticQuestions,
        cognitiveTrace: data.cognitiveTrace,
        cognitiveInsight: data.cognitiveInsight,
      });
      
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .insert({
          user_id: user!.id,
          ai_output: aiOutputText,
        })
        .select('id')
        .single();
      
      if (!historyError) {
        setHistoryId(historyData.id);
      }
      
      toast.success('Analysis complete!');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
      setStatus(prev => [...prev, 'Error occurred']);
      setWorkflowState('IDLE');
    }
  };

  const handleConfirmAndAnalyze = () => {
    handleAnalyzeText(editedText);
  };

  const handleSaveResult = async () => {
    if (!result || !user) return;
    
    try {
      const { error } = await supabase.from('analysis_history').insert({
        user_id: user.id,
        student_id: studentId !== 'none' ? studentId : null,
        classroom_id: classroomId !== 'none' ? classroomId : null,
        input_type: inputMode,
        input_content: inputMode === 'text' ? textInput : editedText,
        image_url: uploadedImageUrl,
        subject,
        verdict: result.verdict,
        summary: result.summary,
        error_type: result.errorType,
        topic: result.topic,
        cognitive_trace: result.cognitiveTrace as any,
        socratic_questions: result.socraticQuestions as any,
      });

      if (error) throw error;
      setIsSaved(true);
      toast.success('Analysis saved!');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!historyId) {
      toast.error('No history record to update');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('history')
        .update({ is_helpful: isHelpful })
        .eq('id', historyId);
      
      if (error) throw error;
      setFeedbackGiven(true);
      toast.success('Thank you for your feedback!');
    } catch (err: any) {
      toast.error('Failed to save feedback: ' + err.message);
    }
  };

  const resetWorkflow = () => {
    setWorkflowState('IDLE');
    setExtractedText('');
    setEditedText('');
    setResult(null);
    setStatus([]);
    setImageZoom(100);
    setShowChat(false);
  };

  // Scroll to chat section
  const scrollToChat = () => {
    setShowChat(true);
    setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Build analysis context for the chat
  const getAnalysisContext = (): AnalysisContext | undefined => {
    if (!result) return undefined;
    return {
      studentWork: inputMode === 'text' ? textInput : editedText,
      verdict: result.verdict,
      errorType: result.errorType,
      cognitiveTrace: result.cognitiveTrace,
      socraticQuestions: result.socraticQuestions,
      topic: result.topic,
    };
  };

  const verdictConfig = {
    correct: { icon: CheckCircle, label: 'Correct', class: 'bg-success/20 text-success border-success/30' },
    partial: { icon: AlertTriangle, label: 'Partial', class: 'bg-warning/20 text-warning border-warning/30' },
    critical_error: { icon: XCircle, label: 'Critical Error', class: 'bg-destructive/20 text-destructive border-destructive/30' },
  };

  // Render verification split view
  const renderVerificationUI = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ScanText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Verify Digitized Text</h3>
            <p className="text-sm text-muted-foreground">
              Check if the AI read your handwriting correctly. Edit any errors before proceeding.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetWorkflow}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Start Over
        </Button>
      </div>
      
      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left: Image Preview */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Original Image
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setImageZoom(z => Math.max(50, z - 25))}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">{imageZoom}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setImageZoom(z => Math.min(200, z + 25))}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-muted/20">
              <div className="p-4 flex items-center justify-center min-h-[300px]">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Original student work"
                    className="rounded-lg transition-transform duration-200"
                    style={{ transform: `scale(${imageZoom / 100})`, transformOrigin: 'center' }}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Right: Editable Text */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col p-4">
            <Label className="flex items-center gap-2 mb-3">
              <Edit3 className="w-4 h-4" /> Extracted Text (Editable)
            </Label>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 min-h-[300px] resize-none bg-background font-mono text-sm"
              placeholder="Extracted text will appear here..."
            />
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">Tip:</span> Look for [?] markers indicating ambiguous characters. Use LaTeX for math: $x^2$
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      
      <div className="p-4 border-t border-border/50 bg-muted/30">
        <Button
          onClick={handleConfirmAndAnalyze}
          disabled={!editedText.trim()}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 h-12 text-base"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Confirm & Analyze Logic
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render extraction loading state
  const renderExtractionLoading = () => (
    <Card className="glass-card h-full terminal-panel">
      <CardContent className="p-8 flex flex-col items-center justify-center h-full space-y-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <ScanText className="w-16 h-16 text-primary/30" />
          </div>
          <ScanText className="w-16 h-16 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Digitizing Handwriting...</h3>
          <p className="text-sm text-muted-foreground">
            AI is reading and transcribing the image content
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        {status.length > 0 && (
          <div className="space-y-1 text-center">
            {status.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                {i === status.length - 1 ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-success" />
                )}
                {s}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render analyzing loading state
  const renderAnalyzingLoading = () => (
    <Card className="glass-card h-full terminal-panel">
      <CardContent className="p-8 flex flex-col items-center justify-center h-full space-y-6">
        <Brain className="w-16 h-16 text-primary animate-pulse" />
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg">Analyzing Cognitive Pathway...</h3>
          <p className="text-sm text-muted-foreground">
            Tracing the student's thinking process
          </p>
        </div>
        {status.length > 0 && (
          <div className="space-y-1">
            {status.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                {i === status.length - 1 && workflowState === 'ANALYZING' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-success" />
                )}
                {s}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render results — terminal-style
  const renderResults = () => (
    <>
      {/* Verdict Card */}
      <Card className="glass-card hover-glow terminal-panel">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const config = verdictConfig[result!.verdict];
                const Icon = config.icon;
                return (
                  <Badge className={`${config.class} border px-4 py-2 text-base font-medium`}>
                    <Icon className="w-5 h-5 mr-2" />
                    {config.label}
                  </Badge>
                );
              })()}
              {result!.errorType && (
                <Badge variant="outline" className="text-muted-foreground">
                  {result!.errorType}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={resetWorkflow}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
              <Button
                onClick={handleSaveResult}
                disabled={isSaved}
                variant="outline"
                size="sm"
              >
                {isSaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">{result!.summary}</p>
        </CardContent>
      </Card>

      {/* Cognitive Insight Card */}
      {result!.cognitiveInsight && (
        <Card className="glass-card hover-glow terminal-panel bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-warning" /> Cognitive Insight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Eye className="w-4 h-4" /> Focus Level
                </div>
                <p className="font-medium text-foreground">{result!.cognitiveInsight.focusLevel}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Target className="w-4 h-4" /> Struggle Topic
                </div>
                <p className="font-medium text-foreground">{result!.cognitiveInsight.struggleTopic}</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/20 border border-primary/20">
              <p className="text-sm text-foreground leading-relaxed">
                {result!.cognitiveInsight.insightSummary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cognitive Trace */}
      <Card className="glass-card hover-glow terminal-panel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Cognitive Trace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result!.cognitiveTrace.map((step) => (
              <div
                key={step.step}
                className={`flex gap-3 p-3 rounded-lg ${
                  step.isError ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/30'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.isError ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {step.step}
                </div>
                <p className="text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Socratic Questions */}
      <Card className="glass-card hover-glow terminal-panel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent" /> Socratic Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {result!.socraticQuestions.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20"
              >
                <span className="text-accent font-bold">{i + 1}.</span>
                <span className="text-sm">{q}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Feedback Buttons */}
      <Card className="glass-card hover-glow">
        <CardContent className="p-4">
          {feedbackGiven ? (
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Thank you for your feedback!</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Was this analysis helpful?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => handleFeedback(true)}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-success/10 hover:border-success hover:text-success"
                  disabled={!historyId}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Helpful
                </Button>
                <Button
                  onClick={() => handleFeedback(false)}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                  disabled={!historyId}
                >
                  <ThumbsDown className="w-4 h-4" />
                  AI Error
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discuss with Tutor CTA */}
      {!showChat && (
        <Card className="glass-card hover-glow bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
            <h3 className="font-semibold text-lg mb-2">Still confused?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discuss your work with the AI Tutor and get personalized guidance.
            </p>
            <Button onClick={scrollToChat} className="gradient-primary glow-primary">
              <MessageCircle className="w-4 h-4 mr-2" />
              Discuss with Tutor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interactive Follow-up Chat */}
      {showChat && (
        <Card ref={chatRef} className="glass-card hover-glow overflow-hidden terminal-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" /> Interactive Tutor
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowChat(false)}
              >
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px]">
              <SocraticChat
                classroomId={classroomId !== 'none' ? classroomId : undefined}
                analysisContext={getAnalysisContext()}
                compact
                autoStart
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );

  // Main content based on workflow state
  const renderMainContent = () => {
    // Full-screen verification UI
    if (workflowState === 'VERIFYING') {
      return (
        <Card className="glass-card col-span-2 h-[calc(100vh-200px)] min-h-[600px] terminal-panel">
          {renderVerificationUI()}
        </Card>
      );
    }

    return (
      <>
        {/* Input Panel — Left glass */}
        <div className="space-y-4">
          <Card className="glass-card hover-glow">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Student Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Mode Tabs */}
              <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'text' | 'image')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Image
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <School className="w-4 h-4" />
                    Class Context
                  </Label>
                  <Select value={classroomId} onValueChange={setClassroomId}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No class context</SelectItem>
                      {classrooms?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Student selector for teachers only */}
              {!isStudent && (
                <div className="space-y-2">
                  <Label>Link to Student (optional)</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger><SelectValue placeholder="Link to student" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No student</SelectItem>
                      {students?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {inputMode === 'text' ? (
                <div className="space-y-2">
                  <Label>Student's Work</Label>
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste or type the student's work here..."
                    className="min-h-[200px] resize-none bg-muted/30"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Upload Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
                      isDragging 
                        ? 'border-primary bg-primary/10 scale-[1.02]' 
                        : imagePreview 
                          ? 'border-primary/50 bg-muted/30' 
                          : 'border-muted-foreground/30 hover:border-primary/50 bg-muted/30'
                    }`}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-[180px] rounded-lg object-contain" />
                    ) : (
                      <>
                        <Image className={`w-10 h-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className={`text-sm ${isDragging ? 'text-primary' : 'text-muted-foreground'}`}>
                          {isDragging ? 'Drop image here' : 'Click or drag to upload image'}
                        </p>
                      </>
                    )}
                  </button>
                </div>
              )}

              <Button
                onClick={inputMode === 'text' ? handleDirectTextAnalysis : handleExtractText}
                disabled={workflowState !== 'IDLE' && workflowState !== 'RESULTS'}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {workflowState === 'EXTRACTING' || workflowState === 'ANALYZING' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {workflowState === 'EXTRACTING' ? 'Extracting...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    {inputMode === 'image' ? (
                      <>
                        <ScanText className="w-4 h-4 mr-2" />
                        Extract & Verify Text
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Start Analysis
                      </>
                    )}
                  </>
                )}
              </Button>

              {/* Status Log */}
              {status.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  {status.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      {i === status.length - 1 && (workflowState === 'EXTRACTING' || workflowState === 'ANALYZING') ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-success" />
                      )}
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {workflowState === 'EXTRACTING' && renderExtractionLoading()}
          {workflowState === 'ANALYZING' && renderAnalyzingLoading()}
          {workflowState === 'RESULTS' && result && renderResults()}
          {workflowState === 'IDLE' && (
            <Card className="glass-card h-full min-h-[400px] flex items-center justify-center">
              <CardContent className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <Brain className="w-10 h-10 text-indigo-500/40" />
                </div>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  {inputMode === 'image' 
                    ? 'Upload student work to extract and verify text before analysis'
                    : 'Enter student work and click "Start Analysis" to see cognitive insights'}
                </p>
                <p className="text-slate-600 text-xs mt-2">Awaiting input</p>
              </CardContent>
            </Card>
          )}
        </div>
      </>
    );
  };

  return (
    <AppLayout title="Analysis Studio" subtitle="Trace cognitive pathways and generate insights">
      <div className={`animate-fade-in ${workflowState === 'VERIFYING' ? '' : 'grid lg:grid-cols-2 gap-6'}`}>
        {renderMainContent()}
      </div>
    </AppLayout>
  );
};

export default AnalysisStudio;
