import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export function PomodoroTimer() {
  const [totalSeconds, setTotalSeconds] = useState(WORK_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  const reset = useCallback(() => {
    setIsActive(false);
    setTotalSeconds(isBreak ? BREAK_SECONDS : WORK_SECONDS);
  }, [isBreak]);

  useEffect(() => {
    if (!isActive || totalSeconds <= 0) return;
    const t = setInterval(() => {
      setTotalSeconds((s) => {
        if (s <= 1) {
          setIsActive(false);
          setIsBreak((b) => {
            setTotalSeconds(b ? WORK_SECONDS : BREAK_SECONDS);
            return !b;
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isActive, totalSeconds]);

  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const display = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'relative rounded-2xl p-4 transition-all duration-300',
        'bg-white/[0.05] backdrop-blur-xl border border-white/10',
        'shadow-lg',
        isActive && [
          'shadow-primary/25',
          'ring-1 ring-primary/40',
          'shadow-[0_0_30px_-5px_hsl(var(--primary)_/_0.4)]',
        ]
      )}
    >
      {isActive && (
        <div
          className="absolute inset-0 rounded-2xl bg-primary/15 blur-xl -z-10 opacity-70 pointer-events-none"
          aria-hidden
        />
      )}
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Deep Work
        </span>
      </div>
      <div className="text-2xl font-mono font-bold tabular-nums text-white mb-3">
        {display}
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isBreak ? 'Short break' : 'Focus session'}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs"
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={reset}>
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
