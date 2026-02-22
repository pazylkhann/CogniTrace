-- Create a storage bucket for student work images
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-work', 'student-work', true);

-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload student work images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-work' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view their own student work images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-work' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own student work images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-work' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);