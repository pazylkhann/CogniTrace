import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number; // ms per character
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  isComplete: boolean;
  skip: () => void;
}

export const useTypewriter = ({
  text,
  speed = 18,
  enabled = true,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTextRef = useRef('');

  const skip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setIsTyping(false);
    setIsComplete(true);
    indexRef.current = text.length;
    onComplete?.();
  }, [text, onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      setIsTyping(false);
      return;
    }

    // If text has grown (streaming), continue from where we were
    if (text.startsWith(previousTextRef.current) && previousTextRef.current.length > 0) {
      // Text is an extension of what we had - keep typing from current position
      if (indexRef.current >= text.length) {
        // Already caught up
        previousTextRef.current = text;
        return;
      }
    } else if (text !== previousTextRef.current) {
      // Text changed completely - reset
      indexRef.current = 0;
      setDisplayedText('');
      setIsComplete(false);
    }

    previousTextRef.current = text;

    if (indexRef.current < text.length) {
      setIsTyping(true);
      setIsComplete(false);

      const typeNextChar = () => {
        if (indexRef.current < text.length) {
          // Type multiple chars at once for speed (batch of 1-3 chars)
          const charsToAdd = Math.min(2, text.length - indexRef.current);
          indexRef.current += charsToAdd;
          setDisplayedText(text.slice(0, indexRef.current));
          
          timeoutRef.current = setTimeout(typeNextChar, speed);
        } else {
          setIsTyping(false);
          setIsComplete(true);
          onComplete?.();
        }
      };

      timeoutRef.current = setTimeout(typeNextChar, speed);
    } else {
      setIsTyping(false);
      setIsComplete(true);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, enabled, onComplete]);

  return {
    displayedText,
    isTyping,
    isComplete,
    skip,
  };
};
