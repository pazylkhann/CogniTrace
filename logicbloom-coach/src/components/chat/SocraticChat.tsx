import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Sparkles, Wifi, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatMessage, ChatMessageData } from './ChatMessage';
import { ChatInput } from './ChatInput';

// Re-export types for external use
export type { ChatMessageData as ChatMessage };

export interface AnalysisContext {
  studentWork: string;
  verdict: string;
  errorType?: string;
  cognitiveTrace: { step: number; description: string; isError: boolean }[];
  socraticQuestions: string[];
  topic?: string;
}

interface SocraticChatProps {
  sessionId?: string;
  classroomId?: string;
  analysisContext?: AnalysisContext;
  initialMessages?: ChatMessageData[];
  onSessionCreated?: (sessionId: string) => void;
  compact?: boolean;
  autoStart?: boolean;
  className?: string;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error' | 'rate_limited';

export const SocraticChat = ({
  sessionId,
  classroomId,
  analysisContext,
  initialMessages,
  onSessionCreated,
  compact = false,
  autoStart = false,
  className = '',
}: SocraticChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages || []);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Generate initial AI message based on analysis context
  const generateInitialMessage = useCallback(async () => {
    if (!analysisContext || messages.length > 0) return;
    
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const contextPrompt = `The student just completed an analysis of their work. Here's the context:

**Student's Work:** ${analysisContext.studentWork.substring(0, 500)}${analysisContext.studentWork.length > 500 ? '...' : ''}

**Analysis Verdict:** ${analysisContext.verdict}
${analysisContext.errorType ? `**Error Type:** ${analysisContext.errorType}` : ''}
${analysisContext.topic ? `**Topic:** ${analysisContext.topic}` : ''}

**Cognitive Trace:**
${analysisContext.cognitiveTrace.map(t => `Step ${t.step}: ${t.description}${t.isError ? ' (ERROR)' : ''}`).join('\n')}

**Suggested Socratic Questions:**
${analysisContext.socraticQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Based on this analysis, start a Socratic dialogue with the student. Focus on the first error or misconception identified. Ask a single guiding question to help them discover their mistake.`;

      const { data, error } = await supabase.functions.invoke('cognitive-processor', {
        body: {
          mode: 'SOCRATIC_CHAT',
          content: contextPrompt,
          classroomId,
          conversationHistory: [],
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessageData = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        isNew: true,
      };

      setMessages([assistantMessage]);
      setConnectionStatus('connected');
      
      if (!currentSessionId && user) {
        await saveSession([assistantMessage]);
      }
    } catch (err: any) {
      console.error('Failed to generate initial message:', err);
      setConnectionStatus('error');
      const fallbackMessage: ChatMessageData = {
        id: 'welcome',
        role: 'assistant',
        content: analysisContext.verdict === 'correct' 
          ? "Great work! Your solution looks correct. Would you like to explore the concept further or try a more challenging problem?"
          : `I noticed some areas in your work that we can explore together. ${analysisContext.socraticQuestions[0] || "Can you walk me through your thinking process?"}`,
        timestamp: new Date(),
        isNew: true,
      };
      setMessages([fallbackMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setConnectionStatus('idle'), 2000);
    }
  }, [analysisContext, classroomId, currentSessionId, user, messages.length]);

  useEffect(() => {
    if (autoStart && analysisContext && messages.length === 0) {
      generateInitialMessage();
    }
  }, [autoStart, analysisContext, generateInitialMessage, messages.length]);

  // Save session to database
  const saveSession = async (msgs: ChatMessageData[]) => {
    if (!user) return;
    
    try {
      const messagesJson = msgs.map(m => ({
        role: m.role,
        content: m.content,
        imageUrl: m.imageUrl || null,
        timestamp: m.timestamp.toISOString(),
      }));
      
      const contextJson = analysisContext ? {
        verdict: analysisContext.verdict,
        topic: analysisContext.topic || null,
        errorType: analysisContext.errorType || null,
      } : null;

      if (currentSessionId) {
        await supabase
          .from('tutor_sessions')
          .update({ messages: messagesJson, updated_at: new Date().toISOString() })
          .eq('id', currentSessionId);
      } else {
        const { data, error } = await supabase
          .from('tutor_sessions')
          .insert({
            user_id: user.id,
            classroom_id: classroomId || null,
            messages: messagesJson,
            context: contextJson,
            title: analysisContext?.topic || 'Tutor Session',
          })
          .select('id')
          .single();
        
        if (!error && data) {
          setCurrentSessionId(data.id);
          onSessionCreated?.(data.id);
        }
      }
    } catch (err) {
      console.error('Failed to save session:', err);
    }
  };

  // Handle image selection
  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Upload image to storage
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !user) return null;
    
    setIsUploadingImage(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `tutor-chat/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('student-work')
        .upload(fileName, selectedImage);

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('student-work')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) throw signedUrlError;
      
      return signedUrlData.signedUrl;
    } catch (err: any) {
      toast.error('Failed to upload image: ' + err.message);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Stream response from edge function
  const streamResponse = async (
    userMessage: ChatMessageData,
    conversationHistory: { role: string; content: string }[],
    newMessages: ChatMessageData[]
  ): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/cognitive-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        mode: 'SOCRATIC_CHAT',
        content: userMessage.content,
        imageUrl: userMessage.imageUrl,
        conversationHistory,
        classroomId,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    // Create streaming assistant message
    const streamingMessageId = `assistant-${Date.now()}`;
    setMessages([...newMessages, {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      isNew: true,
    }]);

    setConnectionStatus('streaming');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            
            if (parsed.content) {
              fullContent += parsed.content;
              
              // Update the streaming message content
              setMessages(prev => prev.map(msg => 
                msg.id === streamingMessageId 
                  ? { ...msg, content: fullContent }
                  : msg
              ));
              
              scrollToBottom();
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Mark streaming as complete
    setMessages(prev => prev.map(msg => 
      msg.id === streamingMessageId 
        ? { ...msg, isStreaming: false }
        : msg
    ));

    return fullContent;
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    // OPTIMISTIC UI: Immediately show user message
    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      imageUrl: imagePreview || undefined, // Use preview initially
      timestamp: new Date(),
      isNew: true,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setConnectionStatus('connecting');

    // Upload image in background if needed
    let uploadedImageUrl: string | undefined;
    if (selectedImage) {
      uploadedImageUrl = (await uploadImage()) || undefined;
      // Update message with real URL
      if (uploadedImageUrl) {
        userMessage.imageUrl = uploadedImageUrl;
        setMessages(prev => prev.map(m => 
          m.id === userMessage.id ? { ...m, imageUrl: uploadedImageUrl } : m
        ));
      }
    }
    clearSelectedImage();

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Use streaming
      const responseContent = await streamResponse(userMessage, conversationHistory, newMessages);
      
      if (!responseContent.trim()) {
        console.error('[SocraticChat] Empty response received');
        setConnectionStatus('error');
        toast.error('AI returned an empty response. Please try again.');
        return;
      }

      setConnectionStatus('connected');
      
      // Get the final messages state for saving
      const finalMessages = [...newMessages, {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: responseContent,
        timestamp: new Date(),
      }];
      
      // Save to database
      await saveSession(finalMessages);
      
      setTimeout(() => setConnectionStatus('idle'), 2000);
    } catch (err: any) {
      console.error('[SocraticChat] Chat error:', err);
      setConnectionStatus('error');
      
      const errorMessage = err.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        setConnectionStatus('rate_limited');
        toast.error('System is busy. Please wait a moment and try again.');
      } else if (errorMessage.includes('402')) {
        toast.error('Service quota exceeded. Please contact support.');
      } else {
        toast.error(`Tutor Error: ${errorMessage || 'Failed to get response. Please try again.'}`);
      }
      
      setTimeout(() => setConnectionStatus('idle'), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Connection status indicator
  const ConnectionStatusIndicator = () => {
    if (connectionStatus === 'idle') return null;
    
    const statusConfig = {
      connecting: { icon: Wifi, text: 'Connecting...', className: 'bg-muted/50 text-muted-foreground animate-pulse' },
      streaming: { icon: Sparkles, text: 'AI is thinking...', className: 'bg-violet-500/20 text-violet-400 animate-pulse' },
      connected: { icon: Wifi, text: 'Connected', className: 'bg-emerald-500/20 text-emerald-400' },
      error: { icon: AlertCircle, text: 'Connection error', className: 'bg-destructive/20 text-destructive' },
      rate_limited: { icon: AlertCircle, text: 'Busy, please wait...', className: 'bg-amber-500/20 text-amber-400' },
    };
    
    const config = statusConfig[connectionStatus];
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={cn('text-xs gap-1.5 border-0', config.className)}>
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Connection Status */}
      {connectionStatus !== 'idle' && (
        <div className="px-4 py-2 flex justify-center border-b border-white/5">
          <ConnectionStatusIndicator />
        </div>
      )}
      
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className={cn(
          'space-y-4 py-4',
          compact ? 'px-3' : 'px-4 max-w-4xl mx-auto'
        )}>
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              compact={compact}
              onTypewriterComplete={scrollToBottom}
            />
          ))}
          
          {/* Loading indicator */}
          {isLoading && connectionStatus === 'connecting' && (
            <div className="flex gap-3 justify-start">
              <div className={cn(
                'flex-shrink-0 rounded-full flex items-center justify-center',
                'bg-gradient-to-br from-violet-500/20 to-indigo-500/20 backdrop-blur-sm',
                'border border-white/10',
                compact ? 'w-8 h-8' : 'w-10 h-10'
              )}>
                <Sparkles className={cn('text-violet-400', compact ? 'w-4 h-4' : 'w-5 h-5')} />
              </div>
              <div className={cn(
                'rounded-2xl rounded-bl-md px-5 py-4',
                'bg-white/[0.08] backdrop-blur-xl border border-white/10'
              )}>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        onImageSelect={handleImageSelect}
        isLoading={isLoading}
        isUploadingImage={isUploadingImage}
        imagePreview={imagePreview}
        onClearImage={clearSelectedImage}
        compact={compact}
      />
    </div>
  );
};
