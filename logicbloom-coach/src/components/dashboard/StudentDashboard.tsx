import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sparkles,
  School,
  Plus,
  Loader2,
  ArrowRight,
  BookOpen,
  Trophy,
  Target,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';

const subjectEmoji: Record<string, string> = {
  mathematics: '📐',
  physics: '⚛️',
  chemistry: '🧪',
  biology: '🧬',
  english: '📚',
  history: '🏛️',
  computer_science: '💻',
  economics: '📊',
  science: '🔬',
};

export function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useProfile();
  const store = useGamificationStore();
  const suggestions = Array.isArray(store.suggestions) ? store.suggestions : [];
  const leaderboard = Array.isArray(store.leaderboard) ? store.leaderboard : [];

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [classCode, setClassCode] = useState('');

  const { data: myClasses } = useQuery({
    queryKey: ['my-classes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          classroom_id,
          joined_at,
          classrooms (
            id,
            name,
            subject,
            grade_level
          )
        `)
        .eq('student_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myAnalyses } = useQuery({
    queryKey: ['my-analyses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('class_code', code.toUpperCase())
        .maybeSingle();
      if (findError) throw findError;
      if (!classroom) throw new Error('Class not found. Check the code and try again.');
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('student_id', user.id)
        .maybeSingle();
      if (existing) throw new Error('You are already in this class!');
      const { error: joinError } = await supabase
        .from('class_members')
        .insert({ classroom_id: classroom.id, student_id: user.id });
      if (joinError) throw joinError;
      return classroom;
    },
    onSuccess: (classroom) => {
      queryClient.invalidateQueries({ queryKey: ['my-classes'] });
      toast.success(`You've joined ${classroom.name}!`);
      setClassCode('');
      setJoinDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) joinMutation.mutate(classCode.trim());
  };

  const streak = (() => {
    if (!myAnalyses?.length) return 0;
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasActivity = myAnalyses.some((a) => {
        const d = new Date(a.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });
      if (hasActivity) currentStreak++;
      else if (i > 0) break;
    }
    return currentStreak;
  })();

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const currentRank = leaderboard.find((e) => e.isCurrentUser)?.rank ?? 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-white tracking-tight"
          >
            Hi {firstName}! <span className="inline-block animate-bounce">👋</span>
          </motion.h2>
          <p className="text-slate-400 mt-1">Here’s what we recommend for you today.</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Flame className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <span className="font-semibold text-amber-400">{streak} day streak</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended for You — main content */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" strokeWidth={1.5} />
            Recommended for You
          </h3>
          <div className="grid gap-4">
            {suggestions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => s.actionPath && navigate(s.actionPath)}
                className={cn(
                  'rounded-2xl p-5 bg-white/[0.05] backdrop-blur-xl border border-white/10',
                  'hover:bg-white/[0.08] hover:border-white/15 hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]',
                  'transition-all duration-300 cursor-pointer'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'mb-2 text-xs',
                        s.type === 'review' && 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                        s.type === 'challenge' && 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
                        s.type === 'practice' && 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      )}
                    >
                      {s.type === 'review' && 'Review'}
                      {s.type === 'challenge' && 'Challenge'}
                      {s.type === 'practice' && 'Practice'}
                    </Badge>
                    <h4 className="text-lg font-semibold text-white mb-1">{s.title}</h4>
                    <p className="text-sm text-slate-400 mb-2">{s.subtitle}</p>
                    <p className="text-sm text-slate-500">{s.reason}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 flex-shrink-0" strokeWidth={1.5} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Class Ranking + My Learning Hub */}
        <div className="space-y-6">
          {/* Class Leaderboard */}
          <Card className="bg-white/[0.05] backdrop-blur-xl border-white/10 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
                Class Ranking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    entry.isCurrentUser ? 'bg-indigo-500/15 border border-indigo-500/25' : 'bg-white/[0.03] border border-white/5'
                  )}
                >
                  <span className="text-lg font-bold text-slate-400 w-6">{entry.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium truncate', entry.isCurrentUser ? 'text-white' : 'text-slate-300')}>
                      {entry.name}
                      {entry.isCurrentUser && ' (you)'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white">{entry.points}</span>
                </div>
              ))}
              <p className="text-xs text-slate-500 pt-2">You’re #{currentRank} in your class. Keep going!</p>
            </CardContent>
          </Card>

          {/* My Learning Hub — compact */}
          <Card className="bg-white/[0.05] backdrop-blur-xl border-white/10">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
                My Classes
              </CardTitle>
              <Button size="sm" onClick={() => setJoinDialogOpen(true)} className="bg-white/10 hover:bg-white/15 text-white border-0">
                <Plus className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </CardHeader>
            <CardContent>
              {myClasses && myClasses.length > 0 ? (
                <div className="space-y-2">
                  {myClasses.slice(0, 3).map((membership) => {
                    const classroom = membership.classrooms as { id: string; name: string; subject?: string };
                    const emoji = subjectEmoji[classroom?.subject?.toLowerCase()] || '📖';
                    return (
                      <div
                        key={membership.classroom_id}
                        onClick={() => navigate(`/classrooms/${membership.classroom_id}`)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors"
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-sm font-medium text-white truncate flex-1">{classroom?.name}</span>
                      </div>
                    );
                  })}
                  {myClasses.length > 3 && (
                    <Button variant="ghost" size="sm" className="w-full text-slate-400" onClick={() => navigate('/classrooms')}>
                      View all
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 mb-3">No classes yet</p>
                  <Button size="sm" onClick={() => setJoinDialogOpen(true)} className="bg-white/10 hover:bg-white/15 text-white">
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Join class
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Join Class Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <div className="mx-auto mb-4 p-4 rounded-2xl bg-indigo-500/10 w-fit">
              <School className="w-10 h-10 text-indigo-400" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-center text-xl text-white">Join a Class</DialogTitle>
            <p className="text-center text-sm text-slate-400">Enter the class code from your teacher</p>
          </DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="classCode" className="text-slate-300">Class Code</Label>
              <Input
                id="classCode"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC-123"
                className="text-center text-lg font-mono tracking-wider h-12 bg-white/5 border-white/10 text-white"
                maxLength={7}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setJoinDialogOpen(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!classCode.trim() || joinMutation.isPending}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Class'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
