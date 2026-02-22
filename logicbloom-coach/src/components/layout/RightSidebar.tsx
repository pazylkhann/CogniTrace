import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer, Lightbulb, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function SmartPomodoro() {
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
        'rounded-2xl p-4 bg-white/[0.04] backdrop-blur-xl border border-white/5',
        isActive && 'ring-1 ring-indigo-500/30 shadow-[0_0_24px_-6px_rgba(99,102,241,0.25)]'
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          Smart Pomodoro
        </span>
      </div>
      <div className="text-2xl font-mono font-semibold tabular-nums text-white mb-2">{display}</div>
      <p className="text-xs text-slate-500 mb-3">{isBreak ? 'Short break' : 'Focus'}</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-slate-400 hover:text-white hover:bg-white/5"
          onClick={() => setIsActive(!isActive)}
        >
          {isActive ? <Pause className="w-4 h-4" strokeWidth={1.5} /> : <Play className="w-4 h-4" strokeWidth={1.5} />}
        </Button>
        <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-400 hover:text-white hover:bg-white/5" onClick={reset}>
          <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

export function RightSidebar() {
  const { cogniPoints, level, xpToNextLevel, aiCoachTips, activityFeed } = useGamificationStore();
  const [tipIndex, setTipIndex] = useState(0);
  const tips = Array.isArray(aiCoachTips) ? aiCoachTips : [];
  const feed = Array.isArray(activityFeed) ? activityFeed : [];
  const xpNum = typeof xpToNextLevel === 'number' ? xpToNextLevel : 0;
  const xpProgress = Math.min(100, Math.max(0, 100 - (xpNum / 500) * 100));

  useEffect(() => {
    const t = setInterval(() => {
      setTipIndex((i) => (i + 1) % Math.max(1, tips.length));
    }, 8000);
    return () => clearInterval(t);
  }, [tips.length]);

  return (
    <motion.aside
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 200 }}
      className={cn(
        'fixed right-4 top-4 bottom-4 z-30 w-[320px] flex flex-col',
        'bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10',
        'shadow-2xl shadow-black/20'
      )}
    >
      <div className="p-4 flex flex-col h-full overflow-hidden">
        {/* CogniPoints & Level */}
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Level {level}</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <Zap className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              {cogniPoints} CogniPoints
            </span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-purple-500" />
        </div>

        {/* Smart Pomodoro */}
        <div className="mb-4">
          <SmartPomodoro />
        </div>

        {/* AI Study Coach */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">AI Study Coach</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl p-4 bg-white/[0.04] border border-white/5 text-sm text-slate-300 leading-relaxed"
            >
              {tips[tipIndex] ?? tips[0] ?? 'No tips right now. Complete a few analyses to get personalized advice.'}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feed */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Recent activity</span>
          </div>
          <ScrollArea className="flex-1 -mx-1">
            <div className="space-y-2 pr-2">
              {feed.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      item.verdict === 'correct' && 'bg-emerald-500',
                      item.verdict === 'partial' && 'bg-amber-500',
                      item.verdict === 'incorrect' && 'bg-rose-500',
                      !item.verdict && 'bg-slate-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.label}</p>
                    {item.detail && <p className="text-xs text-slate-500">{item.detail}</p>}
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{item.time}</span>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </motion.aside>
  );
}
