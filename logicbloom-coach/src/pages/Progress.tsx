import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  XCircle,
  Clock,
  Award,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { format, subDays } from 'date-fns';

export default function Progress() {
  const { user } = useAuth();

  const { data: analyses } = useQuery({
    queryKey: ['my-progress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate stats
  const totalAnalyses = analyses?.length || 0;
  const correctCount = analyses?.filter(a => a.verdict === 'correct').length || 0;
  const partialCount = analyses?.filter(a => a.verdict === 'partial').length || 0;
  const incorrectCount = analyses?.filter(a => a.verdict === 'incorrect').length || 0;
  const accuracy = totalAnalyses > 0 ? Math.round((correctCount / totalAnalyses) * 100) : 0;

  // Get weak spots (topics with most incorrect)
  const topicStats = (() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    analyses?.forEach(a => {
      const topic = a.topic || a.subject || 'General';
      if (!stats[topic]) stats[topic] = { correct: 0, total: 0 };
      stats[topic].total++;
      if (a.verdict === 'correct') stats[topic].correct++;
    });
    return Object.entries(stats)
      .map(([topic, { correct, total }]) => ({
        topic,
        accuracy: Math.round((correct / total) * 100),
        total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  })();

  // Progress over time (last 30 days)
  const progressData = (() => {
    const data: Record<string, { date: string; correct: number; total: number }> = {};
    const today = new Date();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(today, i), 'MMM d');
      data[date] = { date, correct: 0, total: 0 };
    }
    
    analyses?.forEach(a => {
      const date = format(new Date(a.created_at), 'MMM d');
      if (data[date]) {
        data[date].total++;
        if (a.verdict === 'correct') data[date].correct++;
      }
    });
    
    return Object.values(data).map(d => ({
      ...d,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    }));
  })();

  // Recent streak
  const streak = (() => {
    if (!analyses?.length) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentStreak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasActivity = analyses.some(a => {
        const analysisDate = new Date(a.created_at);
        analysisDate.setHours(0, 0, 0, 0);
        return analysisDate.getTime() === checkDate.getTime();
      });
      
      if (hasActivity) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
    return currentStreak;
  })();

  return (
    <AppLayout title="My Progress" subtitle="Track your learning journey">
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-gradient">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold font-display">{accuracy}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-gradient">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-accent mb-2" />
              <p className="text-3xl font-bold font-display">{totalAnalyses}</p>
              <p className="text-sm text-muted-foreground">Total Checks</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-gradient">
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 mx-auto text-warning mb-2" />
              <p className="text-3xl font-bold font-display">{streak}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-gradient">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-3xl font-bold font-display">{analyses?.length ? format(new Date(analyses[analyses.length - 1].created_at), 'MMM d') : 'N/A'}</p>
              <p className="text-sm text-muted-foreground">Last Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card border-gradient bg-success/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/20">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold font-display">{correctCount}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-gradient bg-warning/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/20">
                <TrendingUp className="w-8 h-8 text-warning" />
              </div>
              <div>
                <p className="text-3xl font-bold font-display">{partialCount}</p>
                <p className="text-sm text-muted-foreground">Partial</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-gradient bg-destructive/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-destructive/20">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <p className="text-3xl font-bold font-display">{incorrectCount}</p>
                <p className="text-sm text-muted-foreground">Needs Work</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Chart */}
        <Card className="glass-card border-gradient">
          <CardHeader>
            <CardTitle className="font-display">Activity Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number, name: string) => [
                    value, 
                    name === 'total' ? 'Checks' : name
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#progressGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Topic Performance */}
        <Card className="glass-card border-gradient">
          <CardHeader>
            <CardTitle className="font-display">Topic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {topicStats.length > 0 ? (
              <div className="space-y-4">
                {topicStats.slice(0, 8).map((topic) => (
                  <div key={topic.topic} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{topic.topic}</span>
                        <span className="text-sm text-muted-foreground">{topic.total} checks</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            topic.accuracy >= 80 ? 'bg-success' :
                            topic.accuracy >= 50 ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${topic.accuracy}%` }}
                        />
                      </div>
                    </div>
                    <Badge 
                      variant={
                        topic.accuracy >= 80 ? 'default' :
                        topic.accuracy >= 50 ? 'secondary' : 'destructive'
                      }
                    >
                      {topic.accuracy}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No data yet. Start checking your solutions!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
