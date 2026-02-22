import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { School, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function JoinClassCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [classCode, setClassCode] = useState('');

  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error('Not authenticated');

      // Find classroom by code
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('class_code', code.toUpperCase())
        .maybeSingle();

      if (findError) throw findError;
      if (!classroom) throw new Error('Class not found. Check the code and try again.');

      // Check if already a member
      const { data: existing } = await supabase
        .from('class_members')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('student_id', user.id)
        .maybeSingle();

      if (existing) throw new Error('You are already in this class!');

      // Join the class
      const { error: joinError } = await supabase
        .from('class_members')
        .insert({
          classroom_id: classroom.id,
          student_id: user.id,
        });

      if (joinError) throw joinError;
      return classroom;
    },
    onSuccess: (classroom) => {
      queryClient.invalidateQueries({ queryKey: ['my-classes'] });
      toast.success(`You've joined ${classroom.name}!`);
      setClassCode('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      joinMutation.mutate(classCode.trim());
    }
  };

  return (
    <Card className="glass-card border-gradient">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 w-fit">
          <School className="w-10 h-10 text-primary" />
        </div>
        <CardTitle className="font-display text-xl">Join a Class</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Enter the class code your teacher gave you
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classCode">Class Code</Label>
            <Input
              id="classCode"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC-123"
              className="text-center text-lg font-mono tracking-wider h-12 bg-muted/50"
              maxLength={7}
            />
          </div>
          <Button
            type="submit"
            disabled={!classCode.trim() || joinMutation.isPending}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold glow-primary"
          >
            {joinMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Join Class
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
