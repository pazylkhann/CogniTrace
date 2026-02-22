import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, X, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageSelect: (file: File) => void;
  isLoading?: boolean;
  isUploadingImage?: boolean;
  imagePreview?: string | null;
  onClearImage?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const ChatInput = ({
  value,
  onChange,
  onSend,
  onImageSelect,
  isLoading = false,
  isUploadingImage = false,
  imagePreview,
  onClearImage,
  disabled = false,
  compact = false,
}: ChatInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  const canSend = (value.trim() || imagePreview) && !isLoading && !disabled;

  return (
    <div className={cn(
      'w-full',
      compact ? 'px-3 pb-3' : 'px-4 pb-6 pt-2'
    )}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-3 flex justify-center">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Selected"
              className="h-20 rounded-xl object-contain border border-white/10"
            />
            <button
              onClick={onClearImage}
              className={cn(
                'absolute -top-2 -right-2 p-1.5 rounded-full',
                'bg-red-500 text-white',
                'hover:bg-red-600 transition-colors',
                'shadow-lg'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Input Capsule */}
      <div 
        className={cn(
          'mx-auto max-w-3xl',
          'rounded-2xl',
          'bg-white/[0.08] dark:bg-white/[0.05]',
          'backdrop-blur-xl',
          'border border-white/10',
          'shadow-2xl shadow-black/20',
          'p-2',
          'transition-all duration-300',
          'hover:border-white/20',
          'focus-within:border-violet-500/50 focus-within:shadow-violet-500/10'
        )}
      >
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploadingImage}
            className={cn(
              'shrink-0 rounded-xl h-10 w-10',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-white/10'
            )}
          >
            {isUploadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>

          {/* Text Input */}
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={isLoading || disabled}
            className={cn(
              'flex-1 resize-none',
              'bg-transparent border-0',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/60',
              'text-[15px] leading-relaxed',
              compact ? 'min-h-[44px] max-h-[100px]' : 'min-h-[52px] max-h-[150px]'
            )}
          />

          {/* Send Button */}
          <Button
            onClick={onSend}
            disabled={!canSend}
            className={cn(
              'shrink-0 rounded-xl h-10 px-4',
              'bg-gradient-to-r from-violet-600 to-indigo-600',
              'hover:from-violet-500 hover:to-indigo-500',
              'text-white font-medium',
              'shadow-lg shadow-violet-500/25',
              'disabled:opacity-50 disabled:shadow-none',
              'transition-all duration-300'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Helper text */}
      {!compact && (
        <div className="text-center mt-3 text-xs text-muted-foreground/60">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">Shift+Enter</kbd> for new line
        </div>
      )}
    </div>
  );
};
