import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SocraticChat, ChatMessage } from '@/components/chat/SocraticChat';
import { cn } from '@/lib/utils';
import {
  Brain,
  School,
  RefreshCw,
  History,
  MessageCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TutorSession {
  id: string;
  title: string;
  classroom_id: string | null;
  messages: any[];
  context: any;
  created_at: string;
  updated_at: string;
}

const AiTutor = () => {
  const { user } = useAuth();
  const { isStudent } = useRole();
  
  const [selectedClassroom, setSelectedClassroom] = useState<string>('none');
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch joined classes for students
  const { data: myClasses } = useQuery({
    queryKey: ['my-classes-tutor', user?.id],
    queryFn: async () => {
      if (!user) return [];
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
      return data || [];
    },
    enabled: !!user && isStudent,
  });

  // Fetch tutor sessions history
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['tutor-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as TutorSession[];
    },
    enabled: !!user,
  });

  // Load a previous session
  const loadSession = (session: TutorSession) => {
    setActiveSessionId(session.id);
    setSelectedClassroom(session.classroom_id || 'none');
    
    // Convert stored messages to ChatMessage format
    const msgs: ChatMessage[] = (session.messages || []).map((m: any, i: number) => ({
      id: `msg-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      imageUrl: m.imageUrl,
      timestamp: new Date(m.timestamp),
    }));
    
    setInitialMessages(msgs);
    setShowHistory(false);
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
      content: `# Hello! I'm your Socratic Tutor 🧠

I'm here to help you **understand** concepts, not just give you answers. When you share a problem or question, I'll guide you through the thinking process with questions.

**How to use me:**
- Share a problem you're working on
- Tell me where you're stuck
- Upload images of your work for visual guidance

*If you select a class, I can reference your teacher's materials for better context.*

What would you like to work on today?`,
      timestamp: new Date(),
    }]);
  };

  // Initialize with welcome message
  useEffect(() => {
    if (initialMessages.length === 0) {
      startNewConversation();
    }
  }, []);

  return (
    <AppLayout 
      title="AI Tutor" 
      subtitle="Your Socratic learning companion"
    >
      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-[calc(100vh-12rem)] max-h-[900px]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Controls - Glassmorphism */}
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
                <Brain className="w-7 h-7 text-white" />
                {/* Subtle glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 blur-xl opacity-50 -z-10" />
              </div>
              <div>
                <h3 className="font-bold font-display text-lg">Socratic Mentor</h3>
                <p className="text-sm text-muted-foreground">I guide, you discover</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isStudent && myClasses && myClasses.length > 0 && (
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger className="w-[180px] bg-white/[0.08] backdrop-blur-xl border-white/10 rounded-xl">
                    <School className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                    <SelectItem value="none">No class context</SelectItem>
                    {myClasses.map((membership) => {
                      const classroom = membership.classrooms as any;
                      return (
                        <SelectItem key={membership.classroom_id} value={membership.classroom_id}>
                          {classroom?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="lg:hidden rounded-xl bg-white/[0.08] backdrop-blur-xl border-white/10 hover:bg-white/[0.12]"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={startNewConversation}
                className="rounded-xl bg-white/[0.08] backdrop-blur-xl border-white/10 hover:bg-white/[0.12]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Chat Container - Full Glassmorphism */}
          <div className="flex-1 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden">
            <SocraticChat
              key={activeSessionId || 'new'}
              sessionId={activeSessionId}
              classroomId={selectedClassroom !== 'none' ? selectedClassroom : undefined}
              initialMessages={initialMessages}
              onSessionCreated={(id) => {
                setActiveSessionId(id);
                refetchSessions();
              }}
            />
          </div>
        </div>

        {/* History Sidebar - Glassmorphism */}
        <div className={`w-full lg:w-80 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden ${showHistory ? 'block' : 'hidden lg:block'}`}>
          <div className="p-4 border-b border-white/10">
            <h4 className="text-sm font-semibold font-display flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" /> Chat History
            </h4>
          </div>
          <ScrollArea className="h-[calc(100%-60px)] max-h-[700px]">
            <div className="p-3 space-y-2">
              {sessions && sessions.length > 0 ? (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group p-4 rounded-2xl cursor-pointer transition-all duration-300',
                      activeSessionId === session.id 
                        ? 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/30' 
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border border-transparent'
                    )}
                    onClick={() => loadSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title || 'Tutor Session'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.updated_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {session.context?.topic && (
                          <Badge variant="outline" className="mt-2 text-xs rounded-full border-violet-500/30 text-violet-400">
                            {session.context.topic}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No sessions yet</p>
                  <p className="text-xs mt-1 opacity-70">Start a conversation to save it</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
};

export default AiTutor;
