import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { School, Plus, MoreHorizontal, Pencil, Trash2, Users, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { CreateClassroomDialog } from '@/components/classrooms/CreateClassroomDialog';
import { JoinClassCard } from '@/components/classrooms/JoinClassCard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Classrooms() {
  const { user } = useAuth();
  const { isTeacher, isStudent } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Teacher: fetch their classrooms
  const { data: classrooms, isLoading: classroomsLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*, students(count)')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isTeacher,
  });

  // Student: fetch their joined classes
  const { data: myClasses, isLoading: myClassesLoading } = useQuery({
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
            grade_level,
            description
          )
        `)
        .eq('student_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isStudent,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast.success('Classroom deleted');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (classroomId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('student_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-classes'] });
      toast.success('Left the class');
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (classroom: any) => {
    setEditingClassroom(classroom);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingClassroom(null);
  };

  const copyClassCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Class code copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isLoading = isTeacher ? classroomsLoading : myClassesLoading;

  // Student View
  if (isStudent) {
    return (
      <AppLayout title="My Classes" subtitle="Manage your enrolled classes">
        <div className="space-y-6 animate-fade-in">
          {/* Join Class Card */}
          <div className="max-w-md mx-auto">
            <JoinClassCard />
          </div>

          {/* Enrolled Classes */}
          <Card className="glass-card border-gradient">
            <CardHeader>
              <CardTitle className="font-display">Enrolled Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {myClassesLoading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
              ) : myClasses && myClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myClasses.map((membership) => {
                    const classroom = membership.classrooms as any;
                    return (
                      <div
                        key={membership.classroom_id}
                        className="p-6 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border border-border"
                        onClick={() => navigate(`/classrooms/${membership.classroom_id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                            <School className="w-6 h-6 text-primary" />
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                        <h4 className="font-semibold text-lg mb-2">{classroom?.name}</h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {classroom?.subject && (
                            <Badge variant="secondary" className="capitalize">
                              {classroom.subject}
                            </Badge>
                          )}
                          {classroom?.grade_level && (
                            <Badge variant="outline">{classroom.grade_level}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Joined {format(new Date(membership.joined_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <School className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No classes yet. Use the card above to join your first class!</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Teacher View
  return (
    <AppLayout title="Classrooms" subtitle="Organize students by class">
      <Card className="glass-card border-gradient animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Your Classrooms</CardTitle>
          <Button className="gradient-primary" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Classroom
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : classrooms && classrooms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class Code</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.map((classroom) => (
                  <TableRow 
                    key={classroom.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/classrooms/${classroom.id}`)}
                  >
                    <TableCell className="font-medium">{classroom.name}</TableCell>
                    <TableCell>
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (classroom.class_code) copyClassCode(classroom.class_code);
                        }}
                      >
                        <code className="px-2 py-1 rounded bg-muted text-sm font-mono">
                          {classroom.class_code || 'N/A'}
                        </code>
                        {copiedCode === classroom.class_code ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {classroom.subject ? (
                        <Badge variant="secondary" className="capitalize">
                          {classroom.subject}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{classroom.grade_level || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {(classroom.students as any)?.[0]?.count ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(classroom.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(classroom); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(classroom.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center text-muted-foreground">
                <School className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Create your first classroom to organize students.</p>
                <p className="text-sm mt-2">Students can join using a unique class code.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateClassroomDialog
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        classroom={editingClassroom}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classroom?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this classroom. Students in this classroom will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
