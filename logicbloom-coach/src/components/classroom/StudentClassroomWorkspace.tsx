import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SocraticChat, ChatMessage } from '@/components/chat/SocraticChat';
import {
  MessageCircle,
  FileSearch,
  FileText,
  Brain,
  Clock,
  Plus,
  Trash2,
  Eye,
  Image,
  File,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentClassroomWorkspaceProps {
  classroomId: string;
  classroomName: string;
  classroomSubject?: string;
}

interface TutorSession {
  id: string;
  title: string;
  messages: any[];
  context: any;
  created_at: string;
  updated_at: string;
}

export function StudentClassroomWorkspace({ 
  classroomId, 
  classroomName,
  classroomSubject 
}: StudentClassroomWorkspaceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('chat');
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  // Fetch tutor sessions ONLY for this classroom
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['class-tutor-sessions', classroomId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('classroom_id', classroomId)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TutorSession[];
    },
    enabled: !!user && !!classroomId,
  });

  // Fetch analysis history ONLY for this classroom
  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ['class-analyses', classroomId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!classroomId,
  });

  // Fetch materials for this classroom
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['class-materials', classroomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_materials')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!classroomId,
  });

  const viewMaterial = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('class-materials')
      .createSignedUrl(filePath, 3600);
    
    if (error || !data?.signedUrl) {
      toast.error('Failed to access material');
      return;
    }
    
    window.open(data.signedUrl, '_blank');
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Load a previous session
  const loadSession = (session: TutorSession) => {
    setActiveSessionId(session.id);
    const msgs: ChatMessage[] = (session.messages || []).map((m: any, i: number) => ({
      id: `msg-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      imageUrl: m.imageUrl,
      timestamp: new Date(m.timestamp),
    }));
    setInitialMessages(msgs);
    toast.success('Session loaded');
  };

  // Delete a session
  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('tutor_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      if (activeSessionId === sessionId) {
        startNewConversation();
      }
      
      refetchSessions();
      toast.success('Session deleted');
    } catch (err: any) {
      toast.error('Failed to delete session');
    }
  };

  const startNewConversation = () => {
    setActiveSessionId(undefined);
    setInitialMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `# Welcome to ${classroomName}! 🎓

I'm your Socratic tutor for this class. I have access to your teacher's materials and can help guide you through ${classroomSubject || 'your studies'}.

**How I can help:**
- Share a problem you're working on
- Upload images of your work
- Ask me to explain concepts from class

*I'll reference your teacher's materials to give you the most relevant guidance.*

What would you like to work on?`,
      timestamp: new Date(),
    }]);
  };

  // Initialize with welcome message if no messages
  if (initialMessages.length === 0 && activeTab === 'chat') {
    startNewConversation();
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="bg-muted/50 grid w-full grid-cols-3">
        <TabsTrigger value="chat" className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Tutor Chat</span>
          <span className="sm:hidden">Chat</span>
        </TabsTrigger>
        <TabsTrigger value="analysis" className="flex items-center gap-2">
          <FileSearch className="w-4 h-4" />
          <span className="hidden sm:inline">My Work</span>
          <span className="sm:hidden">Work</span>
        </TabsTrigger>
        <TabsTrigger value="materials" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Materials
        </TabsTrigger>
      </TabsList>

      {/* CHAT TAB - Class-scoped */}
      <TabsContent value="chat" className="mt-4">
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-20rem)] max-h-[600px]">
          {/* Chat Area */}
          <Card className="flex-1 glass-card border-gradient overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-medium">Socratic Tutor</span>
                <Badge variant="outline" className="text-xs">{classroomName}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={startNewConversation}>
                <RefreshCw className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
            <SocraticChat
              key={activeSessionId || `new-${classroomId}`}
              sessionId={activeSessionId}
              classroomId={classroomId}
              initialMessages={initialMessages}
              onSessionCreated={(id) => {
                setActiveSessionId(id);
                refetchSessions();
              }}
              compact
            />
          </Card>

          {/* Session History */}
          <Card className="glass-card border-gradient w-full lg:w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" /> Chat History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[400px]">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : sessions && sessions.length > 0 ? (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`group p-2 rounded-lg cursor-pointer transition-all ${
                          activeSessionId === session.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                        onClick={() => loadSession(session)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {session.title || 'Tutor Chat'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(session.updated_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No chats yet for this class</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ANALYSIS TAB - Class-scoped */}
      <TabsContent value="analysis" className="mt-4">
        <Card className="glass-card border-gradient">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2">
              <FileSearch className="w-5 h-5" />
              My Submitted Work
            </CardTitle>
            <Button 
              className="gradient-primary"
              onClick={() => navigate('/analysis', { state: { preselectedClassroom: classroomId } })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Check New Solution
            </Button>
          </CardHeader>
          <CardContent>
            {analysesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : analyses && analyses.length > 0 ? (
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      analysis.verdict === 'correct' ? 'bg-success' :
                      analysis.verdict === 'partial' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <div className="flex-1">
                      <span className="font-medium">{analysis.topic || analysis.subject || 'Problem'}</span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(analysis.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    <Badge variant={
                      analysis.verdict === 'correct' ? 'default' :
                      analysis.verdict === 'partial' ? 'secondary' : 'destructive'
                    }>
                      {analysis.verdict === 'correct' ? '✓ Correct' : 
                       analysis.verdict === 'partial' ? 'Partial' : 'Needs Work'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No work submitted for this class yet</p>
                <p className="text-sm mt-2">Check your first solution to get started!</p>
                <Button 
                  className="mt-4 gradient-primary"
                  onClick={() => navigate('/analysis', { state: { preselectedClassroom: classroomId } })}
                >
                  Check Solution <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* MATERIALS TAB */}
      <TabsContent value="materials" className="mt-4">
        <Card className="glass-card border-gradient">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Class Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {materialsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : materials && materials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => viewMaterial(material.file_url)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getFileIcon(material.file_type)}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <h4 className="font-medium truncate">{material.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(material.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No materials uploaded yet.</p>
                <p className="text-sm mt-2">Your teacher will add resources here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
