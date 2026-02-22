import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileCheck, Brain, TrendingUp, Rocket, Upload, AlertTriangle, Image } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export function TeacherDashboard() {
  const navigate = useNavigate();

  // Fetch analysis history for stats
  const { data: analyses } = useQuery({
    queryKey: ['dashboard-analyses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('id, verdict, error_type, created_at, topic, image_url, student_id, subject')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch student count
  const { data: studentsData } = useQuery({
    queryKey: ['student-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate weekly count
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyAnalyses = analyses?.filter(a => new Date(a.created_at) >= weekAgo) || [];

  // Calculate error breakdown from actual data
  const errorBreakdownData = (() => {
    const errorCounts = { 'Arithmetic': 0, 'Logic': 0, 'Conceptual': 0, 'Notation': 0 };
    analyses?.forEach(analysis => {
      const errorType = analysis.error_type?.toLowerCase() || '';
      if (errorType.includes('arith') || errorType.includes('calc')) {
        errorCounts['Arithmetic']++;
      } else if (errorType.includes('logic') || errorType.includes('reason')) {
        errorCounts['Logic']++;
      } else if (errorType.includes('concept') || errorType.includes('understand')) {
        errorCounts['Conceptual']++;
      } else if (errorType.includes('notation') || errorType.includes('format')) {
        errorCounts['Notation']++;
      } else if (analysis.verdict !== 'correct') {
        errorCounts['Conceptual']++;
      }
    });
    
    return [
      { name: 'Arithmetic', value: errorCounts['Arithmetic'] || 1, color: 'hsl(var(--warning))' },
      { name: 'Logic', value: errorCounts['Logic'] || 1, color: 'hsl(var(--destructive))' },
      { name: 'Conceptual', value: errorCounts['Conceptual'] || 1, color: 'hsl(var(--primary))' },
      { name: 'Notation', value: errorCounts['Notation'] || 1, color: 'hsl(var(--accent))' },
    ].filter(item => item.value > 0);
  })();

  // Weekly progress data
  const weeklyProgressData = (() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => {
      const targetDay = (index + 1) % 7;
      const count = weeklyAnalyses.filter(a => {
        const date = new Date(a.created_at);
        return date.getDay() === targetDay;
      }).length;
      return { day, count };
    });
  })();

  // Find topic mastery (most correct topic)
  const topicMastery = (() => {
    const topicCounts: Record<string, { correct: number; total: number }> = {};
    analyses?.forEach(a => {
      if (a.topic) {
        if (!topicCounts[a.topic]) topicCounts[a.topic] = { correct: 0, total: 0 };
        topicCounts[a.topic].total++;
        if (a.verdict === 'correct') topicCounts[a.topic].correct++;
      }
    });
    const sorted = Object.entries(topicCounts)
      .map(([topic, { correct, total }]) => ({ topic, rate: correct / total }))
      .sort((a, b) => b.rate - a.rate);
    return sorted[0]?.topic || 'N/A';
  })();

  const stats = [
    {
      title: 'Active Students',
      value: studentsData || 0,
      subtitle: 'total enrolled',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Papers Analyzed',
      value: analyses?.length || 0,
      subtitle: `${weeklyAnalyses.length} this week`,
      icon: FileCheck,
      color: 'text-success',
    },
    {
      title: 'Topic Mastery',
      value: topicMastery,
      subtitle: 'best understood',
      icon: Brain,
      color: 'text-warning',
    },
    {
      title: 'Class Accuracy',
      value: analyses?.length
        ? `${Math.round((analyses.filter(a => a.verdict === 'correct').length / analyses.length) * 100)}%`
        : 'N/A',
      subtitle: 'overall',
      icon: TrendingUp,
      color: 'text-accent',
    },
  ];

  const recentAnalyses = analyses?.slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with CTA Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Command Center</h2>
          <p className="text-slate-400 text-sm mt-0.5">Your teaching analytics at a glance</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/classrooms')}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Materials
          </Button>
          <Button
            size="lg"
            onClick={() => navigate('/analysis')}
            className="gradient-primary glow-primary text-primary-foreground font-semibold px-6"
          >
            <Rocket className="w-5 h-5 mr-2" />
            Start New Analysis
          </Button>
        </div>
      </div>

      {/* Bento Grid - Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-fr">
        <Card className="glass-card col-span-2 lg:col-span-5 row-span-2 hover-glow cursor-default">
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stats[0].title}</p>
              <div className="p-3 rounded-xl bg-white/5">
                {(() => { const I = stats[0].icon; return <I className="w-6 h-6 text-primary" />; })()}
              </div>
            </div>
            <p className="text-4xl font-bold mt-2">{stats[0].value}</p>
            <p className="text-xs text-muted-foreground">{stats[0].subtitle}</p>
          </CardContent>
        </Card>
        <Card className="glass-card col-span-1 lg:col-span-3 hover-glow cursor-default">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stats[1].title}</p>
                <p className="text-2xl font-bold mt-1">{stats[1].value}</p>
              </div>
              {(() => { const I = stats[1].icon; return <I className={`w-8 h-8 ${stats[1].color}`} />; })()}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card col-span-1 lg:col-span-2 hover-glow cursor-default">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{stats[2].title}</p>
            <p className="text-xl font-bold mt-1 truncate">{stats[2].value}</p>
          </CardContent>
        </Card>
        <Card className="glass-card col-span-2 lg:col-span-2 hover-glow cursor-default">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{stats[3].title}</p>
            <p className="text-3xl font-bold mt-1">{stats[3].value}</p>
          </CardContent>
        </Card>

        {/* Bento Grid - Charts (side by side) */}
        <div className="col-span-2 lg:col-span-7 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Error Breakdown Pie Chart */}
        <Card className="glass-card hover-glow">
          <CardHeader>
            <CardTitle className="font-display">Error Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {errorBreakdownData.length > 0 ? (
              <div className="flex items-center justify-center gap-8">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={errorBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {errorBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        padding: '12px 16px',
                        boxShadow: '0 0 40px -10px rgba(0,0,0,0.5)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {errorBreakdownData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-8 h-8 text-indigo-500/50" />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">System Ready</p>
                  <p className="text-slate-600 text-xs mt-1">Awaiting analysis input</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress This Week Bar Chart */}
        <Card className="glass-card hover-glow">
          <CardHeader>
            <CardTitle className="font-display">Progress this Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    padding: '12px 16px',
                    boxShadow: '0 0 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number) => [value, 'Analyses']}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>

      {/* Recent Activity - full width in bento */}
      <Card className="glass-card col-span-2 lg:col-span-12 hover-glow">
        <CardHeader>
          <CardTitle className="font-display">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => navigate('/analysis', { state: { analysisId: analysis.id } })}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {analysis.image_url ? (
                      <img src={analysis.image_url} alt="Analysis" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">
                      {analysis.topic || analysis.subject || 'Analysis'}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(analysis.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      analysis.verdict === 'correct'
                        ? 'bg-success/20 text-success'
                        : analysis.verdict === 'partial'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {analysis.verdict === 'correct' ? 'Correct' : analysis.verdict === 'partial' ? 'Partial' : 'Incorrect'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px]">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-slate-500 text-sm">Awaiting Input</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/analysis')}
                  className="text-indigo-400 hover:text-indigo-300 mt-2"
                >
                  Start your first analysis →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
