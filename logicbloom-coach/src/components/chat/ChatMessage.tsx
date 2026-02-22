import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, User } from 'lucide-react';
import { TypewriterText } from './TypewriterText';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  isStreaming?: boolean;
  isNew?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  compact?: boolean;
  onTypewriterComplete?: () => void;
}

export const ChatMessage = ({ message, compact = false, onTypewriterComplete }: ChatMessageProps) => {
  const [hasAnimated, setHasAnimated] = useState(!message.isNew);
  const isUser = message.role === 'user';
  const isAI = message.role === 'assistant';

  useEffect(() => {
    if (message.isNew) {
      // Trigger animation
      const timer = setTimeout(() => setHasAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [message.isNew]);

  return (
    <div
      className={cn(
        'flex gap-3 transition-all duration-500 ease-out',
        isUser ? 'justify-end' : 'justify-start',
        message.isNew && !hasAnimated 
          ? 'opacity-0 translate-y-4' 
          : 'opacity-100 translate-y-0'
      )}
    >
      {/* AI Avatar */}
      {isAI && (
        <div 
          className={cn(
            'flex-shrink-0 rounded-full flex items-center justify-center',
            'bg-gradient-to-br from-violet-500/20 to-indigo-500/20 backdrop-blur-sm',
            'border border-white/10',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}
        >
          <Sparkles className={cn(
            'text-violet-400',
            compact ? 'w-4 h-4' : 'w-5 h-5'
          )} />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] transition-all duration-300',
          compact ? 'px-4 py-2.5' : 'px-5 py-4',
          // Rounded corners - rounder for modern look
          'rounded-2xl',
          isUser && 'rounded-br-md',
          isAI && 'rounded-bl-md',
          // User bubble - gradient
          isUser && [
            'bg-gradient-to-br from-violet-600 to-indigo-600',
            'text-white',
            'shadow-lg shadow-violet-500/25',
          ],
          // AI bubble - glassmorphism
          isAI && [
            'bg-white/[0.08] dark:bg-white/[0.06]',
            'backdrop-blur-xl',
            'border border-white/10',
            'text-foreground',
            'shadow-lg shadow-black/10',
          ]
        )}
      >
        {/* Image attachment */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Uploaded content"
            className="max-h-48 rounded-xl mb-3 object-contain border border-white/10"
          />
        )}

        {/* Message content */}
        {isAI ? (
          <TypewriterText
            text={message.content}
            isStreaming={message.isStreaming}
            speed={12}
            className="text-[15px] leading-relaxed"
            onComplete={onTypewriterComplete}
          />
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content}
          </p>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div 
          className={cn(
            'flex-shrink-0 rounded-full flex items-center justify-center',
            'bg-gradient-to-br from-violet-600 to-indigo-600',
            'shadow-lg shadow-violet-500/25',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}
        >
          <User className={cn(
            'text-white',
            compact ? 'w-4 h-4' : 'w-5 h-5'
          )} />
        </div>
      )}
    </div>
  );
};
