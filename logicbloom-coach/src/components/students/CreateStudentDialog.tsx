import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: {
    id: string;
    name: string;
    email: string | null;
    student_identifier: string | null;
    classroom_id: string | null;
    notes: string | null;
  };
}

export function CreateStudentDialog({ open, onOpenChange, student }: CreateStudentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!student;

  const [name, setName] = useState(student?.name || '');
  const [email, setEmail] = useState(student?.email || '');
  const [identifier, setIdentifier] = useState(student?.student_identifier || '');
  const [classroomId, setClassroomId] = useState(student?.classroom_id || '');
  const [notes, setNotes] = useState(student?.notes || '');

  useEffect(() => {
    if (student) {
      setName(student.name);
      setEmail(student.email || '');
      setIdentifier(student.student_identifier || '');
      setClassroomId(student.classroom_id || '');
      setNotes(student.notes || '');
    }
  }, [student]);

  const { data: classrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const data = {
        name,
        email: email || null,
        student_identifier: identifier || null,
        classroom_id: classroomId && classroomId !== 'none' ? classroomId : null,
        notes: notes || null,
        user_id: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('students')
          .update(data)
          .eq('id', student.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('students').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(isEditing ? 'Student updated!' : 'Student added!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setIdentifier('');
    setClassroomId('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-gradient sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Student Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              className="bg-muted/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@school.edu"
              className="bg-muted/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="identifier">Student ID (optional)</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g., STU-001"
              className="bg-muted/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="classroom">Classroom</Label>
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Assign to classroom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No classroom</SelectItem>
                {classrooms?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this student..."
              className="bg-muted/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="gradient-primary"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Student'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
