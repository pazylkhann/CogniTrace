-- Fix: Class Materials Storage Policy - Overpermissive Access
-- Issue: Students could access ALL class materials, not just from classrooms they joined

-- Drop the existing overpermissive policy
DROP POLICY IF EXISTS "Students can view materials from joined classes" ON storage.objects;

-- Create a properly scoped policy that checks classroom membership via file path
-- Files should be stored as: {classroom_id}/{filename}
-- This policy extracts the classroom_id from the file path and verifies membership
CREATE POLICY "Students can view materials from joined classes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'class-materials'
  AND public.has_role(auth.uid(), 'student')
  AND EXISTS (
    SELECT 1 
    FROM public.class_members cm
    WHERE cm.student_id = auth.uid()
    AND cm.classroom_id::text = split_part(storage.objects.name, '/', 1)
  )
);