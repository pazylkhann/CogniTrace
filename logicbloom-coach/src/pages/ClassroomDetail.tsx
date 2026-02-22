import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Upload, 
  Copy, 
  CheckCircle2,
  File,
  Image,
  Trash2,
  Loader2,
  Eye,
  TrendingUp,
  Brain,
  AlertTriangle,
  Home,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { StudentClassroomWorkspace } from '@/components/classroom/StudentClassroomWorkspace';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ClassroomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isTeacher } = useRole();
  const queryClient = useQueryClient();
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch classroom details
  const { data: classroom, isLoading: classroomLoading } = useQuery({
    queryKey: ['classroom', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch class members (for teachers)
  const { data: members } = useQuery({
    queryKey: ['class-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_members')
        .select('*')
        .eq('classroom_id', id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && isTeacher,
  });

  // Fetch materials
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ['class-materials', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_materials')
        .select('*')
        .eq('classroom_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user || !id) throw new Error('Missing required data');
      
      setUploading(true);
      
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('class-materials')
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Store the file path (not URL) - we'll generate signed URLs on demand
      // Create material record with the storage path
      const { error: insertError } = await supabase
        .from('class_materials')
        .insert({
          classroom_id: id,
          title: materialTitle || selectedFile.name,
          file_url: filePath, // Store path, not URL
          file_type: selectedFile.type,
          uploaded_by: user.id,
        });
      
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-materials', id] });
      toast.success('Material uploaded!');
      setUploadDialogOpen(false);
      setMaterialTitle('');
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from('class_materials')
        .delete()
        .eq('id', materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-materials', id] });
      toast.success('Material deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyClassCode = useCallback(async () => {
    if (classroom?.class_code) {
      await navigator.clipboard.writeText(classroom.class_code);
      setCopiedCode(true);
      toast.success('Class code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [classroom?.class_code]);

  const viewMaterial = useCallback(async (filePath: string) => {
    // Generate a signed URL for secure, time-limited access
    const { data, error } = await supabase.storage
      .from('class-materials')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error || !data?.signedUrl) {
      toast.error('Failed to access material');
      return;
    }
    
    window.open(data.signedUrl, '_blank');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!materialTitle) {
        setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  if (classroomLoading) {
    return (
      <AppLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!classroom) {
    return (
      <AppLayout title="Classroom Not Found" subtitle="">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">This classroom doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/classrooms')}>Back to Classrooms</Button>
        </div>
      </AppLayout>
    );
  }

  // For students - show the isolated classroom workspace
  if (!isTeacher) {
    return (
      <AppLayout 
        title={classroom.name} 
        subtitle={`${classroom.subject || 'No subject'} • ${classroom.grade_level || 'No grade'}`}
      >
        <div className="space-y-4 animate-fade-in">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{classroom.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Student Workspace - Class-Scoped */}
          <StudentClassroomWorkspace 
            classroomId={id!}
            classroomName={classroom.name}
            classroomSubject={classroom.subject || undefined}
          />
        </div>
      </AppLayout>
    );
  }

  // Teacher view - original tabs layout
  return (
    <AppLayout 
      title={classroom.name} 
      subtitle={`${classroom.subject || 'No subject'} • ${classroom.grade_level || 'No grade'}`}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb for Teachers */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/classrooms">Classrooms</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{classroom.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button & Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button variant="ghost" onClick={() => navigate('/classrooms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Classrooms
          </Button>
          
          {classroom.class_code && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Class Code:</span>
              <button
                onClick={copyClassCode}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <code className="font-mono font-semibold text-lg">{classroom.class_code}</code>
                {copiedCode ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Copy className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="materials" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="materials">
              <FileText className="w-4 h-4 mr-2" />
              Materials
            </TabsTrigger>
            {isTeacher && (
              <>
                <TabsTrigger value="students">
                  <Users className="w-4 h-4 mr-2" />
                  Students ({members?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card className="glass-card border-gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display">Learning Materials</CardTitle>
                {isTeacher && (
                  <Button className="gradient-primary" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Material
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {materialsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : materials && materials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getFileIcon(material.file_type)}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewMaterial(material.file_url)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isTeacher && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteMaterialMutation.mutate(material.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <h4 className="font-medium truncate">{material.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(material.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No materials uploaded yet.</p>
                    {isTeacher && (
                      <p className="text-sm mt-2">Upload formulas, notes, or reference images for your students.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab (Teacher Only) */}
          {isTeacher && (
            <>
              <TabsContent value="students">
                <Card className="glass-card border-gradient">
                  <CardHeader>
                    <CardTitle className="font-display">Enrolled Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {members && members.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-mono text-sm">
                                {member.student_id.slice(0, 8)}...
                              </TableCell>
                              <TableCell>
                                {format(new Date(member.joined_at), 'MMM d, yyyy')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No students have joined yet.</p>
                        <p className="text-sm mt-2">Share the class code with your students: <strong>{classroom.class_code}</strong></p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass-card border-gradient">
                    <CardHeader>
                      <CardTitle className="font-display flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Class Struggle Map
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Analytics coming soon</p>
                        <p className="text-sm mt-2">Track which topics cause the most errors across all students</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card border-gradient">
                    <CardHeader>
                      <CardTitle className="font-display flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-success" />
                        Class Mastery Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>Track average mastery per student</p>
                        <p className="text-sm mt-2">Data will appear as students use the analysis tool</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="glass-card border-gradient">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Formulas"
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="bg-muted/50"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || uploading}
              className="gradient-primary"
            >
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
