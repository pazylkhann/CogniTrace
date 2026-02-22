import { useTypewriter } from '@/hooks/useTypewriter';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface TypewriterTextProps {
  text: string;
  isStreaming?: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

// Blinking cursor component
const BlinkingCursor = () => (
  <span className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-primary animate-pulse align-middle" />
);

export const TypewriterText = ({
  text,
  isStreaming = false,
  speed = 15,
  className,
  onComplete,
}: TypewriterTextProps) => {
  const { displayedText, isTyping, skip } = useTypewriter({
    text,
    speed,
    enabled: true,
    onComplete,
  });

  const showCursor = isTyping || isStreaming;

  return (
    <div 
      className={cn('relative', className)}
      onClick={isTyping ? skip : undefined}
      role={isTyping ? 'button' : undefined}
      title={isTyping ? 'Click to skip animation' : undefined}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
        <ReactMarkdown>{displayedText}</ReactMarkdown>
      </div>
      {showCursor && <BlinkingCursor />}
    </div>
  );
};
