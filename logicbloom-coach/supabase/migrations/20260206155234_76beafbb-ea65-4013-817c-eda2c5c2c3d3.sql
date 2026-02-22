-- Add classroom_id to analysis_history for class-scoped analysis
ALTER TABLE public.analysis_history 
ADD COLUMN classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_analysis_history_classroom_id ON public.analysis_history(classroom_id);

-- Add RLS policy for students to view analyses within their enrolled classes
CREATE POLICY "Students can view analyses for their enrolled classes"
ON public.analysis_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (
    classroom_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM class_members 
      WHERE class_members.classroom_id = analysis_history.classroom_id 
      AND class_members.student_id = auth.uid()
    )
  )
);