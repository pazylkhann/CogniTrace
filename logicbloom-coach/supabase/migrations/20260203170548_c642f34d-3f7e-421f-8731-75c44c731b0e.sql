-- Add RLS policies for teachers to manage class members in their own classrooms

-- Allow teachers to enroll students in their classrooms
CREATE POLICY "Teachers can enroll students in their classes"
ON public.class_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = class_members.classroom_id
    AND classrooms.user_id = auth.uid()
  )
);

-- Allow teachers to remove students from their classrooms
CREATE POLICY "Teachers can remove students from their classes"
ON public.class_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE classrooms.id = class_members.classroom_id
    AND classrooms.user_id = auth.uid()
  )
);