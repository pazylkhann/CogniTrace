import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RightDetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function RightDetailPanel({ open, onClose, title, children }: RightDetailPanelProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-4 bottom-4 z-50 w-[360px]',
          'glass-panel rounded-2xl mx-4',
          'flex flex-col overflow-hidden',
          'slide-in-right shadow-2xl'
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10">
          <h3 className="font-semibold text-white">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-slate-400 text-sm">
          {children}
        </div>
      </aside>
    </>
  );
}
